import type { FastifyPluginAsync } from 'fastify';
import {
  GreenhouseConfig,
  GreenhouseConfigResponseSchema,
  GreenhouseConfigDataSchema,
  GreenhouseConfigType,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const stateByUser: Record<string, GreenhouseConfigType> = {};

const greenhouseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/greenhouses/current',
    {
      preHandler: app.auth,
      schema: { response: { 200: GreenhouseConfigResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      if (!stateByUser[uid]) {
        stateByUser[uid] = GreenhouseConfig.parse(
          await readMock<unknown>('greenhouse.json'),
        );
      }
      return ok(stateByUser[uid]);
    },
  );

  app.put(
    '/api/greenhouses/current',
    {
      preHandler: app.auth,
      schema: {
        body: GreenhouseConfigDataSchema,
        response: { 200: GreenhouseConfigResponseSchema },
      },
    },
    async (req) => {
      const payload = GreenhouseConfig.parse(req.body);
      const uid = req.user!.uid;
      stateByUser[uid] = payload;
      return ok(stateByUser[uid]);
    },
  );
};

export default greenhouseRoutes;
