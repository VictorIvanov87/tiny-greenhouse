import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TimelapseFrame, TimelapseListResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const TimelapseQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const timelapseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/timelapse',
    {
      schema: { response: { 200: TimelapseListResponseSchema } },
    },
    async (req) => {
      const query = TimelapseQuery.parse(req.query);
      const frames = TimelapseFrame.array().parse(
        await readMock<unknown>('timelapse.json'),
      );

      const items = frames.slice(-query.limit);
      const total = frames.length;

      return ok({ items, total });
    },
  );
};

export default timelapseRoutes;
