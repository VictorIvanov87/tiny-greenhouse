import type { FastifyPluginAsync } from 'fastify';
import { GreenhouseConfig, GreenhouseConfigResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { getGreenhouseConfig, saveGreenhouseConfig } from '../services/greenhouse';

const greenhouseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/greenhouses/current',
    {
      preHandler: app.auth,
      schema: { response: { 200: GreenhouseConfigResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const config = await getGreenhouseConfig(uid);
      return ok(config);
    },
  );

  app.put(
    '/api/greenhouses/current',
    {
      preHandler: app.auth,
      schema: {
        body: GreenhouseConfig,
        response: { 200: GreenhouseConfigResponseSchema },
      },
    },
    async (req) => {
      const payload = GreenhouseConfig.parse(req.body);
      const uid = req.user!.uid;
      const updated = saveGreenhouseConfig(uid, payload);
      return ok(updated);
    },
  );
};

export default greenhouseRoutes;
