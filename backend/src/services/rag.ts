import { RagChunkSchema, type RagChunk } from '../lib/schemas';
import { getEmbeddingProvider } from '../ai/providers';
import { searchChunks, type RagChunkRow } from '../ai/vector-store';

const defaultTopK = Number(process.env.RAG_TOP_K ?? 8);

export const isVectorStoreEnabled = () => {
  const store = (process.env.VECTOR_STORE ?? 'pgvector').toLowerCase();
  return store === 'pgvector';
};

const mapRow = (row: RagChunkRow): RagChunk => ({
  id: row.id,
  cropId: row.cropId,
  stage: row.stage,
  lang: row.lang,
  sourcePath: row.sourcePath,
  chunk: row.chunk,
  score: typeof row.score === 'number' ? Number(row.score) : undefined,
});

export const retrieveChunks = async (opts: {
  query: string;
  cropId: string;
  lang: string;
  stage?: string | null;
  topK?: number;
}): Promise<RagChunk[]> => {
  const provider = getEmbeddingProvider();
  const embedding = await provider.embed(opts.query);
  const rows = await searchChunks({
    embedding,
    cropId: opts.cropId,
    lang: opts.lang,
    stage: opts.stage ?? null,
    limit: opts.topK ?? defaultTopK,
  });

  return rows.map((row) => RagChunkSchema.parse(mapRow(row)));
};
