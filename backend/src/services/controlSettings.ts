import { ControlSettings, type ControlSettingsType } from '../lib/schemas';
import { ensureFirebase, type Firestore } from '../lib/firebase';
import { updateDeviceTwinDesired } from '../lib/iothub';
import { listDevicesByOwner } from './telemetry';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const cache = new Map<string, ControlSettingsType>();

let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) {
    _db = ensureFirebase().db;
  }
  return _db;
};

const HARDCODED_DEFAULTS: ControlSettingsType = {
  version: 1,
  thresholds: {
    tempMaxC: 26,
    humidityMaxPct: 70,
    soilMoisturePctMin: 40,
    soilMoisturePctMax: 60,
  },
  lights: {
    startHour: 9,
    endHour: 21,
  },
  fan: {
    periodicEverySec: 3600,
    periodicDurationSec: 300,
    humidityOverridePct: 70,
  },
  pump: {
    triggerPct: 43,
    delayAfterMeasurementSec: 25,
    pulseDurationSec: 5,
    settleWindowSec: 1800,
    maxPulsesPerDay: 6,
  },
};

export const getControlSettings = async (uid: string): Promise<ControlSettingsType> => {
  const cached = cache.get(uid);
  if (cached) return cached;

  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(USERS_COLLECTION).doc(uid).get();
    const raw = doc.data()?.controlSettings;
    if (raw) {
      const parsed = ControlSettings.safeParse(raw);
      if (parsed.success) {
        cache.set(uid, parsed.data);
        return parsed.data;
      }
    }
  }

  cache.set(uid, HARDCODED_DEFAULTS);
  return HARDCODED_DEFAULTS;
};

export type SetControlSettingsResult = {
  settings: ControlSettingsType;
  twinDeviceIds: string[];
  twinErrors: { deviceId: string; message: string }[];
};

export const setControlSettings = async (
  uid: string,
  incoming: ControlSettingsType,
): Promise<SetControlSettingsResult> => {
  // Bump version monotonically so firmware can detect change.
  const previous = await getControlSettings(uid);
  const settings: ControlSettingsType = { ...incoming, version: previous.version + 1 };

  cache.set(uid, settings);

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .set({ controlSettings: settings }, { merge: true });
  }

  const twinDeviceIds = await listDevicesByOwner(uid);
  const twinErrors: { deviceId: string; message: string }[] = [];

  for (const deviceId of twinDeviceIds) {
    try {
      await updateDeviceTwinDesired(deviceId, settings);
    } catch (err) {
      twinErrors.push({
        deviceId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { settings, twinDeviceIds, twinErrors };
};
