import { NotificationPrefs, type NotificationPrefsType } from '../lib/schemas';
import { readMock } from '../lib/file';

const cache = new Map<string, NotificationPrefsType>();
let defaultPrefs: NotificationPrefsType | null = null;

const getDefaultPrefs = async (): Promise<NotificationPrefsType> => {
  if (!defaultPrefs) {
    const data = await readMock<unknown>('notifications.json');
    defaultPrefs = NotificationPrefs.parse(data);
  }

  return defaultPrefs;
};

export const getUserPrefs = async (uid: string): Promise<NotificationPrefsType> => {
  const existing = cache.get(uid);
  if (existing) {
    return existing;
  }

  const prefs = { ...(await getDefaultPrefs()) };
  cache.set(uid, prefs);
  return prefs;
};

export const setUserPrefs = (uid: string, prefs: NotificationPrefsType) => {
  cache.set(uid, prefs);
};
