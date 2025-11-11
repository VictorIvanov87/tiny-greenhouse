import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { getEmbeddingProvider } from '../ai/providers';
import {
  ensureRagSchema,
  insertChunks,
  resetChunksForSources,
  type RagChunkInsert,
} from '../ai/vector-store';

type StageEntry = {
  id: string;
  label?: string;
  cues?: string[];
  guidance?: string;
};

type WarningEntry = {
  stage?: string | null;
  text: string;
};

type FaqEntry = {
  q: string;
  a: string;
};

type SeedDoc = {
  crop: {
    id: string;
    variety: string;
    lang?: string;
    displayName?: string;
    defaultStage?: string;
  };
  overview?: string;
  stages?: StageEntry[];
  defaults?: Record<string, unknown>;
  warnings?: WarningEntry[];
  faq?: FaqEntry[];
};

type RawChunk = {
  cropId: string;
  lang: string;
  stage?: string | null;
  sourcePath: string;
  text: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');
const ragRoot = resolve(repoRoot, '..', 'data', 'rag');

const MAX_CHARS = 900;

const chunkText = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }
  const paragraphs = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    if (!buffer) {
      buffer = paragraph;
      continue;
    }
    if ((buffer + '\n\n' + paragraph).length <= MAX_CHARS) {
      buffer += '\n\n' + paragraph;
      continue;
    }
    chunks.push(buffer);
    buffer = paragraph;
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
};

const formatDefaults = (defaults: Record<string, unknown>) => {
  const lines: string[] = [];
  for (const [group, value] of Object.entries(defaults)) {
    lines.push(`${group.toUpperCase()}:`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, entry] of Object.entries(value)) {
        lines.push(`- ${key}: ${entry}`);
      }
    } else {
      lines.push(String(value));
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

const buildChunksFromSeed = ({
  doc,
  yamlPath,
}: {
  doc: SeedDoc;
  yamlPath: string;
}): RawChunk[] => {
  const cropId = doc.crop.id;
  const lang = doc.crop.lang ?? 'en';
  const sourcePath = relative(repoRoot, yamlPath);
  const results: RawChunk[] = [];
  const displayName = doc.crop.displayName ?? doc.crop.variety ?? cropId;

  if (doc.overview) {
    const overviewText = `Overview for ${displayName}\n\n${doc.overview.trim()}`;
    chunkText(overviewText).forEach((chunk) =>
      results.push({ cropId, lang, stage: doc.crop.defaultStage ?? null, sourcePath, text: chunk }),
    );
  }

  if (doc.stages?.length) {
    for (const stage of doc.stages) {
      const header = `Stage: ${stage.label ?? stage.id}`;
      const cues = stage.cues?.length ? `Cues:\n- ${stage.cues.join('\n- ')}` : null;
      const body = stage.guidance ?? '';
      const payload = [header, cues, body].filter(Boolean).join('\n\n');
      chunkText(payload).forEach((chunk) =>
        results.push({ cropId, lang, stage: stage.id, sourcePath, text: chunk }),
      );
    }
  }

  if (doc.defaults) {
    const defaultsText = formatDefaults(doc.defaults);
    if (defaultsText) {
      chunkText(`Defaults\n\n${defaultsText}`).forEach((chunk) =>
        results.push({ cropId, lang, stage: doc.crop.defaultStage ?? null, sourcePath, text: chunk }),
      );
    }
  }

  if (doc.warnings?.length) {
    for (const warning of doc.warnings) {
      const text = `Warning${warning.stage ? ` (${warning.stage})` : ''}: ${warning.text}`;
      chunkText(text).forEach((chunk) =>
        results.push({ cropId, lang, stage: warning.stage ?? null, sourcePath, text: chunk }),
      );
    }
  }

  if (doc.faq?.length) {
    for (const faq of doc.faq) {
      const text = `Q: ${faq.q}\nA: ${faq.a}`;
      chunkText(text).forEach((chunk) =>
        results.push({ cropId, lang, stage: doc.crop.defaultStage ?? null, sourcePath, text: chunk }),
      );
    }
  }

  return results;
};

const buildMarkdownChunks = async (mdPath: string, cropId: string, lang: string): Promise<RawChunk[]> => {
  const buffer = await readFile(mdPath, 'utf-8');
  const sourcePath = relative(repoRoot, mdPath);
  return chunkText(buffer).map((chunk) => ({ cropId, lang, stage: null, sourcePath, text: chunk }));
};

const discoverSeedFiles = async () => {
  const seeds: string[] = [];
  const cropsDir = join(ragRoot, 'crops');
  const cropFolders = await readdir(cropsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of cropFolders) {
    if (!entry.isDirectory()) {
      continue;
    }
    const cropPath = join(cropsDir, entry.name);
    const files = await readdir(cropPath, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile() && extname(file.name) === '.yaml') {
        seeds.push(join(cropPath, file.name));
      }
    }
  }
  return seeds;
};

const collectCompanionMarkdown = async (dir: string, base: string) => {
  const all = await readdir(dir, { withFileTypes: true });
  const matches: string[] = [];
  for (const entry of all) {
    if (!entry.isFile() || extname(entry.name) !== '.md') {
      continue;
    }
    if (entry.name.startsWith(base)) {
      matches.push(join(dir, entry.name));
    }
  }
  return matches;
};

const main = async () => {
  console.log('> Tiny Greenhouse RAG seeder');
  const seeds = await discoverSeedFiles();
  if (!seeds.length) {
    console.warn('No seed files found under data/rag');
    return;
  }

  const provider = getEmbeddingProvider();
  await ensureRagSchema();

  for (const yamlPath of seeds) {
    console.log(`\nProcessing ${relative(repoRoot, yamlPath)}`);
    const raw = await readFile(yamlPath, 'utf-8');
    const doc = YAML.parse(raw) as SeedDoc;

    if (!doc?.crop?.id || !doc.crop.variety) {
      console.warn(`Skipping ${yamlPath}: missing crop metadata`);
      continue;
    }

    const yamlChunks = buildChunksFromSeed({ doc, yamlPath });
    const baseName = basename(yamlPath, '.yaml');
    const companions = await collectCompanionMarkdown(dirname(yamlPath), baseName);
    const mdChunks: RawChunk[] = [];
    for (const mdPath of companions) {
      mdChunks.push(...(await buildMarkdownChunks(mdPath, doc.crop.id, doc.crop.lang ?? 'en')));
    }

    const rawChunks = [...yamlChunks, ...mdChunks];
    if (!rawChunks.length) {
      console.warn('No chunkable text found, skipping');
      continue;
    }

    const sourcePaths = new Set<string>(rawChunks.map((chunk) => chunk.sourcePath));
    await resetChunksForSources(Array.from(sourcePaths));

    const inserts: RagChunkInsert[] = [];
    for (const chunk of rawChunks) {
      const embedding = await provider.embed(chunk.text);
      inserts.push({
        cropId: chunk.cropId,
        stage: chunk.stage ?? null,
        lang: chunk.lang,
        sourcePath: chunk.sourcePath,
        chunk: chunk.text,
        embedding,
      });
    }

    await insertChunks(inserts);
    console.log(`Inserted ${inserts.length} chunks from ${sourcePaths.size} source(s).`);
  }

  console.log('\nSeeding complete.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
