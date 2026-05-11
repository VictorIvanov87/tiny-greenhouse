import { Timestamp } from 'firebase-admin/firestore';
import type { DeviceRecord } from '../lib/schemas';
import { ensureFirebase } from '../lib/firebase';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const COLLECTION = 'devices';

/** In-memory device store for mock mode. Shared across routes/services. */
export const mockDevices = new Map<string, DeviceRecord>();

export class DeviceOwnershipError extends Error {
  status: 403 | 404;
  code: 'DEVICE_NOT_FOUND' | 'DEVICE_NOT_OWNED';

  constructor(code: 'DEVICE_NOT_FOUND' | 'DEVICE_NOT_OWNED', message: string) {
    super(message);
    this.name = 'DeviceOwnershipError';
    this.code = code;
    this.status = code === 'DEVICE_NOT_FOUND' ? 404 : 403;
  }
}

const docToRecord = (id: string, d: FirebaseFirestore.DocumentData): DeviceRecord => ({
  deviceId: id,
  ownerId: d.ownerId,
  greenhouseId: d.greenhouseId,
  type: d.type,
  name: d.name,
  registeredAt: (d.registeredAt as Timestamp).toDate().toISOString(),
});

export const listDevicesForUser = async (uid: string): Promise<DeviceRecord[]> => {
  if (STORAGE_MODE === 'firestore') {
    const { db } = ensureFirebase();
    const snap = await db.collection(COLLECTION).where('ownerId', '==', uid).get();
    return snap.docs.map((doc) => docToRecord(doc.id, doc.data()));
  }
  return Array.from(mockDevices.values()).filter((d) => d.ownerId === uid);
};

/**
 * Returns the device record if `uid` owns it, otherwise throws DeviceOwnershipError.
 */
export const assertDeviceOwnership = async (
  uid: string,
  deviceId: string,
): Promise<DeviceRecord> => {
  if (STORAGE_MODE === 'firestore') {
    const { db } = ensureFirebase();
    const doc = await db.collection(COLLECTION).doc(deviceId).get();
    if (!doc.exists) {
      throw new DeviceOwnershipError('DEVICE_NOT_FOUND', `Device ${deviceId} is not registered`);
    }
    const data = doc.data()!;
    if (data.ownerId !== uid) {
      throw new DeviceOwnershipError('DEVICE_NOT_OWNED', 'Device is owned by another user');
    }
    return docToRecord(doc.id, data);
  }

  const record = mockDevices.get(deviceId);
  if (!record) {
    throw new DeviceOwnershipError('DEVICE_NOT_FOUND', `Device ${deviceId} is not registered`);
  }
  if (record.ownerId !== uid) {
    throw new DeviceOwnershipError('DEVICE_NOT_OWNED', 'Device is owned by another user');
  }
  return record;
};
