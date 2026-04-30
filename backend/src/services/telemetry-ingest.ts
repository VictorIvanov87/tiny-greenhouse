import {
  TelemetryIngestBody,
  type TelemetryAcceptedSample,
} from '../lib/schemas';
import { insertTelemetry, lookupDevice } from './telemetry';

// ---------------------------------------------------------------------------
// Shared telemetry ingestion — used by both the HTTP route and IoT Hub consumer
// ---------------------------------------------------------------------------

export type IngestResult =
  | { ok: true; sample: TelemetryAcceptedSample }
  | { ok: false; code: string; message: string; status: number };

/**
 * Validate, resolve device ownership, and persist a telemetry sample.
 * Accepts a raw (snake_case) body — the same shape the ESP32 sends.
 */
export const ingestTelemetry = async (raw: unknown): Promise<IngestResult> => {
  const result = TelemetryIngestBody.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      code: 'INVALID_TELEMETRY_PAYLOAD',
      message: 'Telemetry payload is invalid',
      status: 400,
    };
  }

  const body = result.data;

  const ownership = await lookupDevice(body.device_id);
  if (!ownership) {
    return {
      ok: false,
      code: 'UNKNOWN_DEVICE',
      message: `Device '${body.device_id}' is not registered`,
      status: 403,
    };
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

  await insertTelemetry(sample, ownership);

  return { ok: true, sample };
};
