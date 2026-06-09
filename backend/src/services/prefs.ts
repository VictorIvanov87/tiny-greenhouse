import { NotificationPrefs, type NotificationPrefsType } from '../lib/schemas';
import { readMock } from '../lib/file';
import { ensureFirebase, type Firestore } from '../lib/firebase';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const cache = new Map<string, NotificationPrefsType>();
let defaultPrefs: NotificationPrefsType | null = null;

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
// Defaults
// ---------------------------------------------------------------------------

const HARDCODED_DEFAULTS: NotificationPrefsType = {
  email: true,
  push: false,
  immediate: true,
  digestDaily: false,
  digestHour: 9,
  quietHours: null,
  rules: [
    { id: 'default-soil', metric: 'soilMoisture', condition: 'below', value: 25, enabled: true },
    { id: 'default-temp', metric: 'temperature', condition: 'above', value: 32, enabled: true },
  ],
};

const getDefaultPrefs = async (): Promise<NotificationPrefsType> => {
  if (!defaultPrefs) {
    if (STORAGE_MODE === 'mock') {
      const data = await readMock<unknown>('notifications.json');
      defaultPrefs = NotificationPrefs.parse(data);
    } else {
      defaultPrefs = HARDCODED_DEFAULTS;
    }
  }

  return defaultPrefs;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getUserPrefs = async (uid: string): Promise<NotificationPrefsType> => {
  const existing = cache.get(uid);
  if (existing) {
    return existing;
  }

  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(USERS_COLLECTION).doc(uid).get();
    const raw = doc.data()?.notificationPrefs;
    if (raw) {
      const parsed = NotificationPrefs.safeParse(raw);
      if (parsed.success) {
        cache.set(uid, parsed.data);
        return parsed.data;
      }
    }
  }

  const prefs = { ...(await getDefaultPrefs()), rules: [...(await getDefaultPrefs()).rules] };
  cache.set(uid, prefs);
  return prefs;
};

export const setUserPrefs = async (uid: string, prefs: NotificationPrefsType) => {
  cache.set(uid, prefs);

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .set({ notificationPrefs: prefs }, { merge: true });
  }
};
