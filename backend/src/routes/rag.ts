import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { RagSearchResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { isVectorStoreEnabled, retrieveChunks } from '../services/rag';
import { resolveAssistContext } from '../services/assist';

const RagSearchBody = z
  .object({
    query: z.string().min(1),
    cropId: z.string().optional(),
    lang: z.enum(['en', 'bg']).optional(),
    stage: z.string().optional(),
    topK: z.number().int().min(1).max(20).optional(),
  })
  .strict();

const ragRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/rag/search',
    {
      preHandler: app.auth,
      schema: {
        body: RagSearchBody,
        response: {
          200: RagSearchResponseSchema,
          403: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const isDev = process.env.NODE_ENV !== 'production';
      const debugEnabled =
        process.env.RAG_DEBUG === 'true' || (process.env.RAG_DEBUG !== 'false' && isDev);
      if (!debugEnabled) {
        reply.code(403);
        throw errorBody('rag_disabled', 'RAG debugging endpoint disabled');
      }

      if (!isVectorStoreEnabled()) {
        reply.code(503);
        throw errorBody('vector_store_disabled', 'Vector store is not configured');
      }

      const body = RagSearchBody.parse(req.body);
      const context = await resolveAssistContext(req.user!.uid);
      const items = await retrieveChunks({
        query: body.query,
        cropId: context.cropId,
        lang: context.lang,
        stage: context.stage,
        topK: body.topK,
      });

      return ok({
        items,
        total: items.length,
      });
    },
  );
};

export default ragRoutes;
