import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  ISODate,
  TelemetrySample,
  TelemetryListResponseSchema,
  TelemetryIngestBody,
  TelemetryIngestResponseSchema,
  ErrorResponseSchema,
  type TelemetryAcceptedSample,
} from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { readMock } from '../lib/file';
import { insertTelemetry, lookupDevice, queryTelemetry } from '../services/telemetry';

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
        const samples = await queryTelemetry({
          ownerId: uid,
          deviceId: query.sensor,
          from: query.from,
          to: query.to,
          limit: query.limit,
        });

        const items: TelemetrySample[] = samples.map((s) => ({
          timestamp: s.receivedAt,
          temperature: s.temperatureC,
          humidity: s.humidityPct,
          soilMoisture: s.soilMoistureRaw ?? 0,
          lightLux: s.lightLux,
          pressureHpa: s.pressureHpa,
          sensor: s.deviceId,
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
      const result = TelemetryIngestBody.safeParse(req.body);
      if (!result.success) {
        return reply.status(400).send(
          errorBody('INVALID_TELEMETRY_PAYLOAD', 'Telemetry payload is invalid'),
        );
      }

      const body = result.data;

      // Resolve device ownership
      const ownership = await lookupDevice(body.device_id);
      if (!ownership) {
        return reply.status(403).send(
          errorBody('UNKNOWN_DEVICE', `Device '${body.device_id}' is not registered`),
        );
      }

      const sample: TelemetryAcceptedSample = {
        deviceId: body.device_id,
        uptimeMs: body.uptime_ms,
        temperatureC: body.temperature_c,
        humidityPct: body.humidity_pct,
        pressureHpa: body.pressure_hpa,
        lightLux: body.light_lux,
        soilMoistureRaw: body.soil_moisture_raw,
        receivedAt: new Date().toISOString(),
      };

      try {
        await insertTelemetry(sample, ownership);
      } catch (err) {
        req.log.error(err, 'Failed to persist telemetry sample');
        return reply.status(500).send(
          errorBody('TELEMETRY_PERSIST_FAILED', 'Could not persist telemetry sample'),
        );
      }

      return ok({ accepted: true as const, sample });
    },
  );
};

export default telemetryRoutes;
