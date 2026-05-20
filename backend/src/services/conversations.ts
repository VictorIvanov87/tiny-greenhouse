import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { ensureFirebase, type Firestore } from '../lib/firebase';
import type { ChatTurn } from '../lib/schemas';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const CONVERSATIONS_COLLECTION = 'conversations';
const TURNS_SUBCOLLECTION = 'turns';

let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) _db = ensureFirebase().db;
  return _db;
};

// ── Mock store (in-memory, lives for the dev-server process) ──────────────

type MockConversation = {
  threadId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  turns: ChatTurn[];
};

const mockStore = new Map<string, MockConversation>();

// ── Public API ────────────────────────────────────────────────────────────

export const createConversation = async (ownerId: string): Promise<{ threadId: string }> => {
  const threadId = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();

  if (STORAGE_MODE === 'firestore') {
    await db()
      .collection(CONVERSATIONS_COLLECTION)
      .doc(threadId)
      .set({
        ownerId,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    return { threadId };
  }

  mockStore.set(threadId, {
    threadId,
    ownerId,
    createdAt: nowIso,
    updatedAt: nowIso,
    turns: [],
  });
  return { threadId };
};

export const assertThreadOwnership = async (
  threadId: string,
  ownerId: string,
): Promise<boolean> => {
  if (STORAGE_MODE === 'firestore') {
    const doc = await db().collection(CONVERSATIONS_COLLECTION).doc(threadId).get();
    if (!doc.exists) return false;
    return doc.data()?.ownerId === ownerId;
  }
  return mockStore.get(threadId)?.ownerId === ownerId;
};

export const appendTurn = async (
  threadId: string,
  turn: { role: 'user' | 'assistant'; content: string },
): Promise<ChatTurn> => {
  const now = new Date();
  const nowIso = now.toISOString();
  const id = randomUUID();
  const record: ChatTurn = { id, role: turn.role, content: turn.content, createdAt: nowIso };

  if (STORAGE_MODE === 'firestore') {
    const conv = db().collection(CONVERSATIONS_COLLECTION).doc(threadId);
    await conv
      .collection(TURNS_SUBCOLLECTION)
      .doc(id)
      .set({
        role: turn.role,
        content: turn.content,
        createdAt: Timestamp.fromDate(now),
      });
    await conv.update({ updatedAt: Timestamp.fromDate(now) });
    return record;
  }

  const conv = mockStore.get(threadId);
  if (!conv) throw new Error(`Unknown thread ${threadId}`);
  conv.turns.push(record);
  conv.updatedAt = nowIso;
  return record;
};

export const getTurns = async (
  threadId: string,
  limit = 20,
): Promise<ChatTurn[]> => {
  if (STORAGE_MODE === 'firestore') {
    const snap = await db()
      .collection(CONVERSATIONS_COLLECTION)
      .doc(threadId)
      .collection(TURNS_SUBCOLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const rows: ChatTurn[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        role: data.role,
        content: data.content,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : String(data.createdAt),
      };
    });
    return rows.reverse();
  }

  const conv = mockStore.get(threadId);
  if (!conv) return [];
  return conv.turns.slice(-limit);
};
