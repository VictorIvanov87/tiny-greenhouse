import type { FastifyPluginAsync } from 'fastify';
import { GreenhouseConfig, GreenhouseConfigResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const greenhouseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/greenhouses/current',
    {
      schema: { response: { 200: GreenhouseConfigResponseSchema } },
    },
    async () => {
      const config = GreenhouseConfig.parse(
        await readMock<unknown>('greenhouse.json'),
      );
      return ok(config);
    },
  );
};

export default greenhouseRoutes;
