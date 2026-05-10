import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  ISODate,
  TelemetrySample,
  TelemetryListResponseSchema,
  TelemetryIngestResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { readMock } from '../lib/file';
import { queryTelemetry, rawToSoilPercent } from '../services/telemetry';
import { ingestTelemetry } from '../services/telemetry-ingest';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';

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
      preHandler: app.auth,
      schema: { response: { 200: TelemetryListResponseSchema } },
    },
    async (req) => {
      const query = TelemetryQuery.parse(req.query);
      const uid = req.user!.uid;

      if (STORAGE_MODE === 'firestore') {
        req.log.info({ uid, from: query.from, to: query.to, limit: query.limit }, 'Telemetry query params');
        const samples = await queryTelemetry({
          ownerId: uid,
          deviceId: query.sensor,
          from: query.from,
          to: query.to,
          limit: query.limit,
        });
        req.log.info({ resultCount: samples.length }, 'Telemetry query result');

        const items: TelemetrySample[] = samples.map((s) => ({
          timestamp: s.receivedAt,
          temperature: s.temperatureC,
          humidity: s.humidityPct,
          soilMoisture: rawToSoilPercent(s.soilMoistureRaw),
          lightLux: s.lightLux,
          pressureHpa: s.pressureHpa,
          sensor: s.deviceId,
          pumpOn: s.pumpOn ?? false,
          lightsOn: s.lightsOn ?? false,
          fanOn: s.fanOn ?? false,
          waterLevelLow: s.waterLevelLow ?? false,
          sensorError: s.sensorError,
        }));

        return ok({ items, total: items.length });
      }

      // Mock mode: serve from mock JSON with time-shifted timestamps
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

  // POST /api/telemetry — ingestion endpoint for the main ESP32 controller.
  // Unauthenticated (ESP32 can't do Firebase auth). Device must be registered
  // via POST /api/devices first; ownership is resolved from the device record.
  app.post(
    '/api/telemetry',
    {
      schema: {
        response: {
          200: TelemetryIngestResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await ingestTelemetry(req.body);

      if (!result.ok) {
        return reply.status(result.status as 400 | 403 | 500).send(
          errorBody(result.code, result.message),
        );
      }

      return ok({ accepted: true as const, sample: result.sample });
    },
  );
};

export default telemetryRoutes;
