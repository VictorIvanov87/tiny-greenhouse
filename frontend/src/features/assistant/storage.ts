import type { ChatMessage } from './types';

const STORAGE_PREFIX = 'tg.assistant.v1';

const hasWindow = () => typeof window !== 'undefined' && 'localStorage' in window;

const safeParse = (raw: string | null): ChatMessage[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
};

export const buildStorageKey = (userId?: string | null, cropId?: string | null, variety?: string | null) => {
  const parts = [
    STORAGE_PREFIX,
    userId && userId.trim() ? userId.trim() : 'anon',
    cropId && cropId.trim() ? cropId.trim() : 'unknown',
    variety && variety.trim() ? variety.trim() : 'default',
  ];

  return parts.join(':');
};

export const loadTranscript = (key: string): ChatMessage[] => {
  if (!hasWindow()) {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  return safeParse(raw);
};

export const saveTranscript = (key: string, messages: ChatMessage[]) => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to persist assistant transcript', error);
  }
};
