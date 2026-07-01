import { WiFiSettings, type WiFiSettingsType, type WiFiSettingsInputType } from '../lib/schemas';
import { ensureFirebase, type Firestore } from '../lib/firebase';
import { updateDeviceTwinDesired } from '../lib/iothub';
import { listDevicesByOwner } from './telemetry';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const cache = new Map<string, WiFiSettingsType>();

let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) {
    _db = ensureFirebase().db;
  }
  return _db;
};

// version 0 + empty ssid = "never configured via UI"; boards run on their
// compiled secrets.h credentials until the user saves a network here.
const HARDCODED_DEFAULTS: WiFiSettingsType = {
  version: 0,
  ssid: '',
  password: '',
};

export const getWiFiSettings = async (uid: string): Promise<WiFiSettingsType> => {
  const cached = cache.get(uid);
  if (cached) return cached;

  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(USERS_COLLECTION).doc(uid).get();
    const raw = doc.data()?.wifiSettings;
    if (raw) {
      const parsed = WiFiSettings.safeParse(raw);
      if (parsed.success) {
        cache.set(uid, parsed.data);
        return parsed.data;
      }
    }
  }

  cache.set(uid, HARDCODED_DEFAULTS);
  return HARDCODED_DEFAULTS;
};

export type SetWiFiSettingsResult = {
  settings: WiFiSettingsType;
  twinDeviceIds: string[];
  twinErrors: { deviceId: string; message: string }[];
};

export const setWiFiSettings = async (
  uid: string,
  incoming: WiFiSettingsInputType,
): Promise<SetWiFiSettingsResult> => {
  // Bump version monotonically so firmware can detect a new credential set.
  const previous = await getWiFiSettings(uid);
  const settings: WiFiSettingsType = {
    ssid: incoming.ssid,
    password: incoming.password,
    version: previous.version + 1,
  };

  cache.set(uid, settings);

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .set({ wifiSettings: settings }, { merge: true });
  }

  // Fan out to every device the user owns. Nested under `wifi` so the merge
  // sits alongside thresholds/lights/camera keys in desired properties.
  const twinDeviceIds = await listDevicesByOwner(uid);
  const twinErrors: { deviceId: string; message: string }[] = [];

  for (const deviceId of twinDeviceIds) {
    try {
      await updateDeviceTwinDesired(deviceId, { wifi: settings });
    } catch (err) {
      twinErrors.push({
        deviceId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { settings, twinDeviceIds, twinErrors };
};
