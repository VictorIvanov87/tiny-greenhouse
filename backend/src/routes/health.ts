import type { FastifyPluginAsync } from 'fastify';
import { HealthResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/health',
    {
      schema: { response: { 200: HealthResponseSchema } },
    },
    async () => ok({ status: 'ok' as const }),
  );
};

export default healthRoutes;
