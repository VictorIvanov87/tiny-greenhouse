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
export const ingestTelemetry = async (
  raw: unknown,
  receivedAt?: string,
): Promise<IngestResult> => {
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

  const channels = body.soil_moisture_channels ?? null;

  if (channels && channels.length > 0) {
    const bad = channels.filter((v) => v <= 0);
    if (bad.length > 0) {
      console.warn(
        `[telemetry] device=${body.device_id} ${bad.length}/${channels.length} soil channel(s) <= 0:`,
        channels,
      );
    } else {
      const mean = channels.reduce((a, b) => a + b, 0) / channels.length;
      const maxDev = Math.max(...channels.map((v) => Math.abs(v - mean)));
      if (mean > 0 && maxDev / mean > 0.25) {
        console.warn(
          `[telemetry] device=${body.device_id} soil channel divergence ${((maxDev / mean) * 100).toFixed(1)}%:`,
          channels,
        );
      }
    }
  }

  const sample: TelemetryAcceptedSample = {
    deviceId: body.device_id,
    uptimeMs: body.uptime_ms,
    temperatureC: body.temperature_c,
    humidityPct: body.humidity_pct,
    pressureHpa: body.pressure_hpa,
    lightLux: body.light_lux,
    soilMoistureRaw: body.soil_moisture_raw,
    soilMoistureChannels: channels,
    pumpOn: body.pump_on,
    lightsOn: body.lights_on,
    fanOn: body.fan_on,
    waterLevelLow: body.water_level_low,
    sensorError: body.sensor_error,
    clockSynced: body.clock_synced,
    pumpTriggerPct: body.pump_trigger_pct,
    receivedAt: receivedAt ?? new Date().toISOString(),
  };

  await insertTelemetry(sample, ownership);

  return { ok: true, sample };
};
