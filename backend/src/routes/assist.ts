import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AssistantResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { buildAssistantAnswer } from '../services/assist';
import { assertRateLimit, RateLimitError } from '../services/rate-limit';
import { isVectorStoreEnabled } from '../services/rag';

const MAX_INPUT = Number(process.env.ASSIST_INPUT_LIMIT ?? 800);

const AssistBody = z.object({
  message: z.string().min(1).max(MAX_INPUT),
});

const assistRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/assist',
    {
      preHandler: app.auth,
      schema: {
        body: AssistBody.strict(),
        response: {
          200: AssistantResponseSchema,
          429: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!isVectorStoreEnabled()) {
        reply.code(503);
        throw errorBody('vector_store_disabled', 'Vector store is not configured');
      }

      try {
        assertRateLimit(`assist:${req.user!.uid}`, 30, 60 * 60 * 1000);
      } catch (error) {
        if (error instanceof RateLimitError) {
          reply.header('Retry-After', String(error.retryAfter));
          reply.code(429);
          throw errorBody('rate_limited', 'Assistant rate limit exceeded');
        }
        throw error;
      }

      const body = AssistBody.parse(req.body);
      const answer = await buildAssistantAnswer(req.user!.uid, body.message);
      return ok(answer);
    },
  );
};

export default assistRoutes;
