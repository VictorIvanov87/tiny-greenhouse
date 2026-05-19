import type { FastifyBaseLogger } from 'fastify';
import { ensureFirebase } from '../lib/firebase';
import { getGreenhouseConfig } from './greenhouse';
import { listDevicesForUser, mockDevices } from './devices';
import { triggerCapture } from './cameraTrigger';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const TICK_INTERVAL_MS = Number(process.env.TIMELAPSE_TICK_INTERVAL_MS ?? 60_000);

// Tracks which local date (YYYY-MM-DD in the user's configured timezone) we
// already captured for a given user. Prevents firing twice in the same hour
// or if the scheduler tick overlaps.
const lastCapturedDate = new Map<string, string>();

let interval: NodeJS.Timeout | null = null;

const localHour = (now: Date, tz: string): number => {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
  }).format(now);
  // Intl can emit "24" for midnight in some locales — normalize.
  const h = parseInt(s, 10);
  return h === 24 ? 0 : h;
};

const localDate = (now: Date, tz: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
};

const listOwnerIds = async (): Promise<string[]> => {
  if (STORAGE_MODE !== 'firestore') {
    const ids = new Set<string>();
    for (const device of mockDevices.values()) ids.add(device.ownerId);
    return Array.from(ids);
  }
  const { db } = ensureFirebase();
  // Cheapest: scan the devices collection for unique ownerIds, since users
  // without devices have nothing to capture.
  const snap = await db.collection('devices').get();
  const ids = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.ownerId) ids.add(data.ownerId as string);
  }
  return Array.from(ids);
};

const checkAndFireForUser = async (
  uid: string,
  log: FastifyBaseLogger,
): Promise<void> => {
  const config = await getGreenhouseConfig(uid).catch(() => null);
  if (!config?.timelapse?.enabled) return;

  const tz = config.timelapse.timezone || 'Europe/Sofia';
  const now = new Date();
  if (localHour(now, tz) !== config.timelapse.hour) return;

  const todayKey = localDate(now, tz);
  if (lastCapturedDate.get(uid) === todayKey) return;

  const devices = await listDevicesForUser(uid);
  const cams = devices.filter((d) => d.type === 'esp32-cam');
  if (cams.length === 0) return;

  lastCapturedDate.set(uid, todayKey);

  for (const cam of cams) {
    try {
      const result = await triggerCapture({
        ownerId: uid,
        camDeviceId: cam.deviceId,
        kind: 'timelapse_capture',
        uploadPath: '/api/camera/upload',
        lightsOff: true,
      });
      log.info(
        {
          uid,
          camDeviceId: cam.deviceId,
          requestId: result.requestId,
          lightsOffApplied: result.lightsOffApplied,
        },
        'Timelapse capture triggered',
      );
    } catch (err) {
      log.error({ err, uid, camDeviceId: cam.deviceId }, 'Timelapse trigger failed');
      // Re-arm so a transient failure doesn't lose the whole day.
      lastCapturedDate.delete(uid);
    }
  }
};

const tick = async (log: FastifyBaseLogger): Promise<void> => {
  try {
    const owners = await listOwnerIds();
    for (const uid of owners) {
      await checkAndFireForUser(uid, log);
    }
  } catch (err) {
    log.error({ err }, 'Timelapse scheduler tick failed');
  }
};

export const startTimelapseScheduler = (log: FastifyBaseLogger): void => {
  if (interval) return;
  log.info({ tickMs: TICK_INTERVAL_MS }, 'Starting timelapse scheduler');
  interval = setInterval(() => {
    void tick(log);
  }, TICK_INTERVAL_MS);
  if (typeof interval.unref === 'function') interval.unref();
};

export const stopTimelapseScheduler = (): void => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

// Exposed for tests / mock-mode poking.
export const _resetTimelapseSchedulerState = (): void => {
  lastCapturedDate.clear();
};
