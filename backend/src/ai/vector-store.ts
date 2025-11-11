import { Pool } from 'pg';

export type RagChunkInsert = {
  cropId: string;
  stage?: string | null;
  lang: string;
  sourcePath: string;
  chunk: string;
  embedding: number[];
};

export type RagChunkRow = {
  id: string;
  cropId: string;
  stage: string | null;
  lang: string;
  sourcePath: string;
  chunk: string;
  score?: number;
};

let pool: Pool | null = null;

const requireDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  return url;
};

const getPool = () => {
  if (pool) {
    return pool;
  }
  const connectionString = requireDatabaseUrl();
  const sslMode = (process.env.DATABASE_SSL ?? 'require').toLowerCase();
  const ssl =
    sslMode === 'disable'
      ? undefined
      : {
          rejectUnauthorized: false,
        };
  pool = new Pool({
    connectionString,
    ssl,
  });
  return pool;
};

const formatVectorLiteral = (values: number[]) => {
  if (!values.length) {
    throw new Error('Cannot store empty vector');
  }
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
};

export const ensureRagSchema = async () => {
  const client = await getPool().connect();
  try {
    const dimensions = Number(process.env.EMBED_DIMENSIONS ?? 1536);
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id BIGSERIAL PRIMARY KEY,
        crop_id TEXT NOT NULL,
        stage TEXT NULL,
        lang TEXT NOT NULL,
        source_path TEXT NOT NULL,
        chunk TEXT NOT NULL,
        embedding VECTOR(${dimensions}) NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS rag_chunks_crop_idx
        ON rag_chunks (crop_id, lang, stage)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
        ON rag_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    `);
  } finally {
    client.release();
  }
};

export const resetChunksForSources = async (sourcePaths: string[]) => {
  if (!sourcePaths.length) {
    return;
  }
  const client = await getPool().connect();
  try {
    await client.query('DELETE FROM rag_chunks WHERE source_path = ANY($1::text[])', [sourcePaths]);
  } finally {
    client.release();
  }
};

export const insertChunks = async (chunks: RagChunkInsert[]) => {
  if (!chunks.length) {
    return;
  }
  const client = await getPool().connect();
  const statement = `
    INSERT INTO rag_chunks (crop_id, stage, lang, source_path, chunk, embedding)
    VALUES ($1, $2, $3, $4, $5, $6::vector)
  `;
  try {
    for (const chunk of chunks) {
      await client.query(statement, [
        chunk.cropId,
        chunk.stage ?? null,
        chunk.lang,
        chunk.sourcePath,
        chunk.chunk,
        formatVectorLiteral(chunk.embedding),
      ]);
    }
  } finally {
    client.release();
  }
};

export const searchChunks = async (opts: {
  embedding: number[];
  cropId: string;
  lang: string;
  stage?: string | null;
  limit: number;
}): Promise<RagChunkRow[]> => {
  const poolInstance = getPool();
  const client = await poolInstance.connect();
  try {
    type RawRow = {
      id: string | number;
      crop_id: string;
      stage: string | null;
      lang: string;
      source_path: string;
      chunk: string;
      score: number | null;
    };

    const { rows } = await client.query<RawRow>(
      `
        SELECT
          id,
          crop_id,
          stage,
          lang,
          source_path,
          chunk,
          1 - (embedding <=> $1::vector) AS score
        FROM rag_chunks
        WHERE crop_id = $2
          AND lang = $3
          AND (
            $4::text IS NULL
            OR stage = $4
            OR stage IS NULL
          )
        ORDER BY embedding <=> $1::vector
        LIMIT $5
      `,
      [formatVectorLiteral(opts.embedding), opts.cropId, opts.lang, opts.stage ?? null, opts.limit],
    );

    return rows.map((row) => ({
      id: String(row.id),
      cropId: row.crop_id,
      stage: row.stage,
      lang: row.lang,
      sourcePath: row.source_path,
      chunk: row.chunk,
      score: typeof row.score === 'number' ? Number(row.score) : undefined,
    }));
  } finally {
    client.release();
  }
};

export const vectorStoreHealth = async () => {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};
