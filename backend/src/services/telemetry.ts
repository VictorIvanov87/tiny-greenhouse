import { TelemetrySample } from '../lib/schemas';
import { readMock } from '../lib/file';

const telemetryCache = new Map<string, TelemetrySample[]>();
let defaultSamples: TelemetrySample[] | null = null;

const loadDefaultTelemetry = async (): Promise<TelemetrySample[]> => {
  if (!defaultSamples) {
    const data = await readMock<unknown>('telemetry.json');
    const parsed = TelemetrySample.array().parse(data);
    defaultSamples = parsed
      .slice()
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }

  return defaultSamples;
};

export const getTelemetrySamples = async (uid: string): Promise<TelemetrySample[]> => {
  const cached = telemetryCache.get(uid);
  if (cached) {
    return cached;
  }

  const samples = (await loadDefaultTelemetry()).map((sample) => ({ ...sample }));
  telemetryCache.set(uid, samples);
  return samples;
};

export const getLatestTelemetry = async (uid: string): Promise<TelemetrySample | null> => {
  const samples = await getTelemetrySamples(uid);
  if (!samples.length) {
    return null;
  }

  return samples[samples.length - 1];
};
