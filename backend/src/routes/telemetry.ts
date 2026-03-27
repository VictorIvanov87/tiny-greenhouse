import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ISODate, TelemetrySample, TelemetryListResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const TelemetryQuery = z.object({
  from: ISODate.optional(),
  to: ISODate.optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(100),
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
      const raw = TelemetrySample.array().parse(
        await readMock<unknown>('telemetry.json'),
      );

      // Shift all timestamps so the most recent sample is always ~5 min ago,
      // preserving relative time differences. This keeps mock data "current"
      // regardless of when the server runs.
      const latestMs = raw.reduce((max, s) => Math.max(max, Date.parse(s.timestamp)), -Infinity);
      const offsetMs = Date.now() - 5 * 60 * 1000 - latestMs;
      const samples = raw.map((s) => ({
        ...s,
        timestamp: new Date(Date.parse(s.timestamp) + offsetMs).toISOString(),
      }));

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
