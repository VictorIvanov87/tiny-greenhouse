import { Timestamp } from 'firebase-admin/firestore';
import { TelemetrySample, type TelemetryAcceptedSample } from '../lib/schemas';
import { readMock } from '../lib/file';
import { ensureFirebase, type Firestore } from '../lib/firebase';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const RETENTION_DAYS = Number(process.env.TELEMETRY_RETENTION_DAYS ?? 90);
const TELEMETRY_COLLECTION = 'telemetry';
const DEVICES_COLLECTION = 'devices';

// ---------------------------------------------------------------------------
// In-memory TTL cache for Firestore reads (follows crops.ts pattern)
// ---------------------------------------------------------------------------

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL_MS = Number(process.env.TELEMETRY_CACHE_TTL_MS) || DEFAULT_CACHE_TTL_MS;

type CachedQuery = { expiresAt: number; payload: TelemetryAcceptedSample[] };
type CachedLatest = { expiresAt: number; payload: TelemetrySample | null };

const queryCache = new Map<string, CachedQuery>();
const latestCache = new Map<string, CachedLatest>();

const invalidateCachesForOwner = (ownerId: string) => {
  for (const key of queryCache.keys()) {
    if (key.startsWith(`query:${ownerId}:`)) {
      queryCache.delete(key);
    }
  }
  latestCache.delete(`latest:${ownerId}`);
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

let _db: Firestore | null = null;

const db = (): Firestore => {
  if (!_db) {
    _db = ensureFirebase().db;
  }
  return _db;
};

// ---------------------------------------------------------------------------
// Device lookup
// ---------------------------------------------------------------------------

interface DeviceOwnership {
  ownerId: string;
  greenhouseId: string;
}

/** Resolve deviceId → owner. Returns null if the device is not registered. */
export const lookupDevice = async (deviceId: string): Promise<DeviceOwnership | null> => {
  if (STORAGE_MODE !== 'firestore') {
    // Mock mode: accept all devices without ownership checks
    return { ownerId: 'demo', greenhouseId: 'gh-1' };
  }

  const doc = await db().collection(DEVICES_COLLECTION).doc(deviceId).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return { ownerId: data.ownerId, greenhouseId: data.greenhouseId };
};

// ---------------------------------------------------------------------------
// Mock (in-memory) storage
// ---------------------------------------------------------------------------

const telemetryCache = new Map<string, TelemetrySample[]>();
const ingestedSamples = new Map<string, TelemetryAcceptedSample[]>();
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

// ---------------------------------------------------------------------------
// Mapper: TelemetryAcceptedSample → TelemetrySample (presentation shape)
// ---------------------------------------------------------------------------

const toTelemetrySample = (s: TelemetryAcceptedSample): TelemetrySample => ({
  timestamp: s.receivedAt,
  temperature: s.temperatureC,
  humidity: s.humidityPct,
  soilMoisture: s.soilMoistureRaw ?? 0,
  lightLux: s.lightLux,
  pressureHpa: s.pressureHpa,
  sensor: s.deviceId,
});

// ---------------------------------------------------------------------------
// Write: insert an accepted telemetry sample
// ---------------------------------------------------------------------------

export const insertTelemetry = async (
  sample: TelemetryAcceptedSample,
  ownership: DeviceOwnership,
): Promise<void> => {
  if (STORAGE_MODE === 'firestore') {
    const receivedAt = Timestamp.fromDate(new Date(sample.receivedAt));
    const expiresAt = Timestamp.fromDate(
      new Date(Date.parse(sample.receivedAt) + RETENTION_DAYS * 86_400_000),
    );

    await db().collection(TELEMETRY_COLLECTION).add({
      deviceId: sample.deviceId,
      ownerId: ownership.ownerId,
      greenhouseId: ownership.greenhouseId,
      uptimeMs: sample.uptimeMs,
      temperatureC: sample.temperatureC,
      humidityPct: sample.humidityPct,
      pressureHpa: sample.pressureHpa,
      lightLux: sample.lightLux,
      soilMoistureRaw: sample.soilMoistureRaw,
      receivedAt,
      expiresAt,
    });
    invalidateCachesForOwner(ownership.ownerId);
    return;
  }

  // Mock mode: store in memory
  const deviceSamples = ingestedSamples.get(sample.deviceId) ?? [];
  deviceSamples.push(sample);
  ingestedSamples.set(sample.deviceId, deviceSamples);
};

// ---------------------------------------------------------------------------
// Read: query telemetry samples
// ---------------------------------------------------------------------------

interface QueryOpts {
  ownerId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  limit: number;
}

export const queryTelemetry = async (opts: QueryOpts): Promise<TelemetryAcceptedSample[]> => {
  if (STORAGE_MODE !== 'firestore') {
    // In mock mode, return ingested samples only (mock GET has its own path)
    const all = opts.deviceId
      ? (ingestedSamples.get(opts.deviceId) ?? [])
      : Array.from(ingestedSamples.values()).flat();

    return all
      .filter((s) => {
        const ts = Date.parse(s.receivedAt);
        if (opts.from && ts < Date.parse(opts.from)) return false;
        if (opts.to && ts > Date.parse(opts.to)) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
      .slice(0, opts.limit);
  }

  // Cache check
  const cacheKey = `query:${opts.ownerId ?? ''}:${opts.deviceId ?? ''}:${opts.from ?? ''}:${opts.to ?? ''}:${opts.limit}`;
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }
  if (cached) {
    queryCache.delete(cacheKey);
  }

  let query = db().collection(TELEMETRY_COLLECTION).orderBy('receivedAt', 'desc');

  if (opts.ownerId) {
    query = query.where('ownerId', '==', opts.ownerId);
  }
  if (opts.deviceId) {
    query = query.where('deviceId', '==', opts.deviceId);
  }
  if (opts.from) {
    query = query.where('receivedAt', '>=', Timestamp.fromDate(new Date(opts.from)));
  }
  if (opts.to) {
    query = query.where('receivedAt', '<=', Timestamp.fromDate(new Date(opts.to)));
  }

  const snap = await query.limit(opts.limit).get();

  const payload = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      deviceId: d.deviceId,
      uptimeMs: d.uptimeMs,
      temperatureC: d.temperatureC,
      humidityPct: d.humidityPct,
      pressureHpa: d.pressureHpa,
      lightLux: d.lightLux ?? null,
      soilMoistureRaw: d.soilMoistureRaw ?? null,
      receivedAt: (d.receivedAt as Timestamp).toDate().toISOString(),
    };
  });

  queryCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  return payload;
};

// ---------------------------------------------------------------------------
// Read: existing API used by alerts & assistant (returns presentation shape)
// ---------------------------------------------------------------------------

export const getTelemetrySamples = async (uid: string): Promise<TelemetrySample[]> => {
  if (STORAGE_MODE === 'firestore') {
    const samples = await queryTelemetry({ ownerId: uid, limit: 2000 });
    return samples.map(toTelemetrySample);
  }

  const cached = telemetryCache.get(uid);
  if (cached) {
    return cached;
  }

  const samples = (await loadDefaultTelemetry()).map((sample) => ({ ...sample }));
  telemetryCache.set(uid, samples);
  return samples;
};

export const getLatestTelemetry = async (uid: string): Promise<TelemetrySample | null> => {
  if (STORAGE_MODE === 'firestore') {
    const latestKey = `latest:${uid}`;
    const cached = latestCache.get(latestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }
    if (cached) {
      latestCache.delete(latestKey);
    }

    const [latest] = await queryTelemetry({ ownerId: uid, limit: 1 });
    const payload = latest ? toTelemetrySample(latest) : null;
    latestCache.set(latestKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return payload;
  }

  const samples = await getTelemetrySamples(uid);
  if (!samples.length) {
    return null;
  }

  return samples[samples.length - 1];
};
