import { GreenhouseConfig, GreenhouseConfigType } from '../lib/schemas';
import { readMock } from '../lib/file';
import { ensureFirebase, type Firestore } from '../lib/firebase';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const USERS_COLLECTION = 'users';

const cache = new Map<string, GreenhouseConfigType>();
let mockDefault: GreenhouseConfigType | null = null;

let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) {
    _db = ensureFirebase().db;
  }
  return _db;
};

const HARDCODED_DEFAULTS: GreenhouseConfigType = {
  id: 'gh-1',
  name: 'My Greenhouse',
  method: 'soil',
  plantType: '',
  language: 'en',
  timelapse: { enabled: false, hour: 9 },
};

const getDefault = async (): Promise<GreenhouseConfigType> => {
  if (STORAGE_MODE === 'firestore') {
    return HARDCODED_DEFAULTS;
  }
  if (!mockDefault) {
    const raw = await readMock<unknown>('greenhouse.json');
    mockDefault = GreenhouseConfig.parse(raw);
  }
  return mockDefault;
};

export const getGreenhouseConfig = async (uid: string): Promise<GreenhouseConfigType> => {
  const cached = cache.get(uid);
  if (cached) return cached;

  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(USERS_COLLECTION).doc(uid).get();
    const raw = doc.data()?.greenhouse;
    if (raw) {
      const parsed = GreenhouseConfig.safeParse(raw);
      if (parsed.success) {
        cache.set(uid, parsed.data);
        return parsed.data;
      }
    }
  }

  const defaults = await getDefault();
  cache.set(uid, defaults);
  return defaults;
};

export const saveGreenhouseConfig = async (
  uid: string,
  config: GreenhouseConfigType,
): Promise<GreenhouseConfigType> => {
  cache.set(uid, config);

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .set({ greenhouse: config }, { merge: true });
  }

  return config;
};
