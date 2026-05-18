import { CameraSettings, type CameraSettingsType } from '../lib/schemas';
import { ensureFirebase, type Firestore } from '../lib/firebase';
import { updateDeviceTwinDesired } from '../lib/iothub';
import { listDevicesForUser } from './devices';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const cache = new Map<string, CameraSettingsType>();

let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) {
    _db = ensureFirebase().db;
  }
  return _db;
};

const HARDCODED_DEFAULTS: CameraSettingsType = {
  version: 1,
  brightness: 0,
  contrast: 1,
  saturation: 0,
  sharpness: 2,
  denoise: 1,
  whitebal: 1,
  awbGain: 1,
  exposureCtrl: 1,
  gainCtrl: 1,
  specialEffect: 0,
  wbMode: 0,
  framesize: 'UXGA',
  jpegQuality: 4,
};

export const getCameraSettings = async (uid: string): Promise<CameraSettingsType> => {
  const cached = cache.get(uid);
  if (cached) return cached;

  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(USERS_COLLECTION).doc(uid).get();
    const raw = doc.data()?.cameraSettings;
    if (raw) {
      const parsed = CameraSettings.safeParse(raw);
      if (parsed.success) {
        cache.set(uid, parsed.data);
        return parsed.data;
      }
    }
  }

  cache.set(uid, HARDCODED_DEFAULTS);
  return HARDCODED_DEFAULTS;
};

export type SetCameraSettingsResult = {
  settings: CameraSettingsType;
  twinDeviceIds: string[];
  twinErrors: { deviceId: string; message: string }[];
};

export const setCameraSettings = async (
  uid: string,
  incoming: CameraSettingsType,
): Promise<SetCameraSettingsResult> => {
  const previous = await getCameraSettings(uid);
  const settings: CameraSettingsType = { ...incoming, version: previous.version + 1 };

  cache.set(uid, settings);

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .set({ cameraSettings: settings }, { merge: true });
  }

  // Fan out only to cam devices owned by this user.
  const allDevices = await listDevicesForUser(uid);
  const camDeviceIds = allDevices.filter((d) => d.type === 'esp32-cam').map((d) => d.deviceId);
  const twinErrors: { deviceId: string; message: string }[] = [];

  for (const deviceId of camDeviceIds) {
    try {
      await updateDeviceTwinDesired(deviceId, { cameraSettings: settings });
    } catch (err) {
      twinErrors.push({
        deviceId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { settings, twinDeviceIds: camDeviceIds, twinErrors };
};
