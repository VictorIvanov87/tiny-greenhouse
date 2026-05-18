/**
 * In-memory, TTL-bound store for ephemeral test camera captures.
 *
 * Test images MUST NOT be persisted (per product requirement). The flow is:
 *  1. UI triggers test capture → backend `registerPending` and pushes a command
 *     to the cam's IoT Hub twin.
 *  2. Cam captures and POSTs the JPEG to `/api/camera/test-upload?requestId=...`.
 *     Backend `storeImage` retains the buffer for IMAGE_TTL_MS.
 *  3. UI polls `getStatus` and, when ready, fetches the image bytes.
 *  4. `sweep` runs periodically and discards expired entries.
 *
 * State is lost on process restart — acceptable for ephemeral test images.
 */

export const PENDING_TTL_MS = 90 * 1000;        // command validity window
export const IMAGE_TTL_MS = 5 * 60 * 1000;      // how long the JPEG stays in RAM
const SWEEP_INTERVAL_MS = 30 * 1000;

export type CaptureKind = 'test_capture' | 'timelapse_capture';

export type PendingCapture = {
  requestId: string;
  deviceId: string;
  ownerId: string;
  type: CaptureKind;
  createdAt: number;
  expiresAt: number;
};

export type StoredImage = {
  buffer: Buffer;
  contentType: string;
  capturedAt: string;
  sizeBytes: number;
  storedAt: number;
  ownerId: string;
};

const pending = new Map<string, PendingCapture>();
const images = new Map<string, StoredImage>();

export const registerPending = (entry: Omit<PendingCapture, 'createdAt' | 'expiresAt'> & {
  createdAt?: number;
  expiresAt?: number;
}): PendingCapture => {
  const createdAt = entry.createdAt ?? Date.now();
  const expiresAt = entry.expiresAt ?? createdAt + PENDING_TTL_MS;
  const record: PendingCapture = {
    requestId: entry.requestId,
    deviceId: entry.deviceId,
    ownerId: entry.ownerId,
    type: entry.type,
    createdAt,
    expiresAt,
  };
  pending.set(entry.requestId, record);
  return record;
};

export const getPending = (requestId: string): PendingCapture | null =>
  pending.get(requestId) ?? null;

/**
 * Returns true if the upload was accepted. False means the requestId is unknown
 * or the pending window has expired — the caller should respond 410.
 */
export const storeImage = (
  requestId: string,
  buffer: Buffer,
  contentType: string,
): boolean => {
  const entry = pending.get(requestId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt + 30 * 1000) return false;

  images.set(requestId, {
    buffer,
    contentType,
    capturedAt: new Date().toISOString(),
    sizeBytes: buffer.length,
    storedAt: Date.now(),
    ownerId: entry.ownerId,
  });
  return true;
};

export type StatusResult =
  | { status: 'pending' }
  | { status: 'ready'; capturedAt: string; sizeBytes: number }
  | { status: 'expired' };

export const getStatus = (requestId: string, uid: string): StatusResult | null => {
  const stored = images.get(requestId);
  if (stored) {
    if (stored.ownerId !== uid) return null;
    return {
      status: 'ready',
      capturedAt: stored.capturedAt,
      sizeBytes: stored.sizeBytes,
    };
  }
  const entry = pending.get(requestId);
  if (!entry) return null;
  if (entry.ownerId !== uid) return null;
  if (Date.now() > entry.expiresAt + 30 * 1000) {
    return { status: 'expired' };
  }
  return { status: 'pending' };
};

export const getImage = (requestId: string, uid: string): StoredImage | null => {
  const stored = images.get(requestId);
  if (!stored || stored.ownerId !== uid) return null;
  return stored;
};

export const sweep = (): void => {
  const now = Date.now();
  for (const [id, entry] of pending) {
    if (now > entry.expiresAt + 5 * 60 * 1000) pending.delete(id);
  }
  for (const [id, img] of images) {
    if (now - img.storedAt > IMAGE_TTL_MS) images.delete(id);
  }
};

let sweeper: NodeJS.Timeout | null = null;

export const startSweeper = (): void => {
  if (sweeper) return;
  sweeper = setInterval(sweep, SWEEP_INTERVAL_MS);
  if (typeof sweeper.unref === 'function') sweeper.unref();
};

export const stopSweeper = (): void => {
  if (sweeper) {
    clearInterval(sweeper);
    sweeper = null;
  }
};
