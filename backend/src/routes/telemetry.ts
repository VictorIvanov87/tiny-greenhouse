import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ISODate, TelemetrySample, TelemetryListResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const TelemetryQuery = z.object({
  from: ISODate.optional(),
  to: ISODate.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sensor: z.string().optional(),
});

const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/telemetry',
    {
      schema: { response: { 200: TelemetryListResponseSchema } },
    },
    async (req) => {
      const query = TelemetryQuery.parse(req.query);
      const samples = TelemetrySample.array().parse(
        await readMock<unknown>('telemetry.json'),
      );

      const filtered = samples.filter((sample) => {
        if (query.sensor && sample.sensor !== query.sensor) {
          return false;
        }

        const ts = Date.parse(sample.timestamp);
        if (Number.isNaN(ts)) {
          return false;
        }

        if (query.from && ts < Date.parse(query.from)) {
          return false;
        }

        if (query.to && ts > Date.parse(query.to)) {
          return false;
        }

        return true;
      });

      const total = filtered.length;
      const items = filtered.slice(-query.limit);

      return ok({ items, total });
    },
  );
};

export default telemetryRoutes;
