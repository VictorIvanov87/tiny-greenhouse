import type { FastifyPluginAsync } from 'fastify';
import { HealthResponseSchema, AiHealthResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { vectorStoreHealth } from '../ai/vector-store';
import { getEmbeddingProvider, getChatProvider } from '../ai/providers';
import { isVectorStoreEnabled } from '../services/rag';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/health',
    {
      schema: { response: { 200: HealthResponseSchema } },
    },
    async () => ok({ status: 'ok' as const }),
  );

  app.get(
    '/api/health/ai',
    {
      schema: { response: { 200: AiHealthResponseSchema } },
    },
    async () => {
      const vectorStore = {
        healthy: false,
        provider: process.env.VECTOR_STORE ?? 'pgvector',
        message: '',
      };

      if (!isVectorStoreEnabled()) {
        vectorStore.message = 'Vector store disabled via env';
      } else {
        try {
          await vectorStoreHealth();
          vectorStore.healthy = true;
          vectorStore.message = 'pgvector reachable';
        } catch (error) {
          vectorStore.message = error instanceof Error ? error.message : 'Vector store error';
        }
      }

      const embeddings = {
        healthy: false,
        provider: process.env.EMBED_PROVIDER ?? 'openai',
        message: '',
      };

      try {
        const provider = getEmbeddingProvider();
        await provider.ping();
        embeddings.healthy = true;
        embeddings.provider = provider.kind;
        embeddings.message = `model=${process.env.EMBED_MODEL ?? 'text-embedding-3-small'}`;
      } catch (error) {
        embeddings.message = error instanceof Error ? error.message : 'Embedding provider error';
      }

      const llm = {
        healthy: false,
        provider: process.env.LLM_PROVIDER ?? 'openai',
        message: '',
      };

      try {
        const provider = getChatProvider();
        await provider.ping();
        llm.healthy = true;
        llm.provider = provider.kind;
        llm.message = `model=${process.env.LLM_MODEL ?? 'gpt-4o-mini'}`;
      } catch (error) {
        llm.message = error instanceof Error ? error.message : 'LLM provider error';
      }

      return ok({ vectorStore, embeddings, llm });
    },
  );
};

export default healthRoutes;
