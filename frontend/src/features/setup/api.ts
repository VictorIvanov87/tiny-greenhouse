import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { authReady, db } from '../auth/firebase';
import type {
  CropDefaults,
  LanguageOption,
  NotificationSettings,
  SetupProfile,
} from './state';
import { api } from '../../shared/hooks/useApi';
import type { GreenhouseConfig } from '../greenhouse/types';

const USERS_COLLECTION = 'users';

type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

type ErrorEnvelope = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

const ensureOk = <T>(payload: Envelope<T>): T => {
  if (payload && 'ok' in payload && payload.ok) {
    return payload.data;
  }

  const message = (payload as ErrorEnvelope)?.error?.message ?? 'Setup API request failed';
  throw new Error(message);
};

const defaultProfile: SetupProfile = {
  setupCompleted: false,
  notifications: { email: false, push: false },
};

export const getCropDefaults = async (cropId: string, variety: string): Promise<CropDefaults> => {
  const { data } = await api.get<Envelope<CropDefaults>>(
    `/crops/${encodeURIComponent(cropId)}/${encodeURIComponent(variety)}/defaults`,
  );
  return ensureOk(data);
};

export const updateGreenhouse = async (
  payload: GreenhouseConfig,
): Promise<GreenhouseConfig> => {
  const { data } = await api.put<Envelope<GreenhouseConfig>>('/greenhouses/current', payload);
  return ensureOk(data);
};

export const getUserProfile = async (uid: string): Promise<SetupProfile | null> => {
  await authReady;
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as SetupProfile;
};

export const ensureUserDoc = async (uid: string): Promise<SetupProfile> => {
  const existing = await getUserProfile(uid);

  if (existing) {
    return existing;
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(userRef, defaultProfile);

  return defaultProfile;
};

type SettingsPayload = {
  cropId: string;
  variety: string;
  language: LanguageOption;
  notifications: NotificationSettings;
  greenhouseId: string;
};

export const saveUserSettings = async (uid: string, payload: SettingsPayload) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const settingsRef = doc(db, USERS_COLLECTION, uid, 'settings', 'preferences');

  await Promise.all([
    setDoc(
      userRef,
      {
        setupCompleted: true,
        language: payload.language,
        cropId: payload.cropId,
        variety: payload.variety,
        plantType: payload.variety,
        notifications: payload.notifications,
        currentGreenhouseId: payload.greenhouseId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      settingsRef,
      {
        cropId: payload.cropId,
        variety: payload.variety,
        language: payload.language,
        notifications: payload.notifications,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
};
