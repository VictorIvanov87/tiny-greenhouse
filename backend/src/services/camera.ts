import { Timestamp } from 'firebase-admin/firestore';
import { ensureFirebase } from '../lib/firebase';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const IMAGES_COLLECTION = 'camera_images';

export interface CameraImageMetadata {
  deviceId: string;
  ownerId: string;
  greenhouseId: string;
  uptimeMs: number;
  capturedAt: string;   // ISO string — server receive time
  receivedAt: string;
  contentType: string;
  sizeBytes: number;
  blobPath: string;
  blobUrl: string;
  storageProvider: 'azure-blob';
  analysisStatus: 'pending';
}

export interface CameraImageListing {
  id: string;
  capturedAt: string;
  blobPath: string;
  blobUrl: string;
}

/**
 * List camera image metadata from Firestore, ordered by capturedAt desc.
 * No-op in mock mode — returns empty array.
 */
export const listCameraImages = async (
  opts: { from?: string; to?: string } = {},
): Promise<CameraImageListing[]> => {
  if (STORAGE_MODE !== 'firestore') return [];

  const { db } = ensureFirebase();
  let q = db.collection(IMAGES_COLLECTION).orderBy('capturedAt', 'desc');

  if (opts.from) {
    q = q.where('capturedAt', '>=', Timestamp.fromDate(new Date(opts.from))) as typeof q;
  }
  if (opts.to) {
    q = q.where('capturedAt', '<=', Timestamp.fromDate(new Date(opts.to))) as typeof q;
  }

  const snapshot = await q.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const capturedAt =
      data['capturedAt'] instanceof Timestamp
        ? data['capturedAt'].toDate().toISOString()
        : String(data['capturedAt']);
    return { id: doc.id, capturedAt, blobPath: String(data['blobPath']), blobUrl: String(data['blobUrl']) };
  });
};

/**
 * Persist camera image metadata to Firestore.
 * No-op in mock mode (blob is already stored; metadata is not needed locally).
 */
export const insertCameraImage = async (meta: CameraImageMetadata): Promise<void> => {
  if (STORAGE_MODE !== 'firestore') return;

  const { db } = ensureFirebase();
  await db.collection(IMAGES_COLLECTION).add({
    ...meta,
    capturedAt: Timestamp.fromDate(new Date(meta.capturedAt)),
    receivedAt: Timestamp.fromDate(new Date(meta.receivedAt)),
  });
};
