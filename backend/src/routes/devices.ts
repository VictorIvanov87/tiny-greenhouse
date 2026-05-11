import type { FastifyPluginAsync } from 'fastify';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DeviceRegistrationBody,
  DeviceRecordResponseSchema,
  DeviceListResponseSchema,
  ErrorResponseSchema,
  type DeviceRecord,
} from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { ensureFirebase } from '../lib/firebase';
import { listDevicesForUser, mockDevices } from '../services/devices';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const COLLECTION = 'devices';

const devicesRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/devices — register a device under the authenticated user's greenhouse
  app.post(
    '/api/devices',
    {
      preHandler: app.auth,
      schema: {
        body: DeviceRegistrationBody,
        response: {
          200: DeviceRecordResponseSchema,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = DeviceRegistrationBody.parse(req.body);
      const uid = req.user!.uid;

      const record: DeviceRecord = {
        deviceId: body.deviceId,
        ownerId: uid,
        greenhouseId: body.greenhouseId,
        type: body.type,
        name: body.name ?? body.deviceId,
        registeredAt: new Date().toISOString(),
      };

      if (STORAGE_MODE === 'firestore') {
        const { db } = ensureFirebase();
        const docRef = db.collection(COLLECTION).doc(body.deviceId);
        const existing = await docRef.get();

        if (existing.exists) {
          const data = existing.data()!;
          if (data.ownerId !== uid) {
            return reply.status(409).send(
              errorBody('DEVICE_ALREADY_REGISTERED', 'Device is registered to another user'),
            );
          }
        }

        await docRef.set({
          ownerId: uid,
          greenhouseId: record.greenhouseId,
          type: record.type,
          name: record.name,
          registeredAt: Timestamp.fromDate(new Date(record.registeredAt)),
        });
      } else {
        const existing = mockDevices.get(body.deviceId);
        if (existing && existing.ownerId !== uid) {
          return reply.status(409).send(
            errorBody('DEVICE_ALREADY_REGISTERED', 'Device is registered to another user'),
          );
        }
        mockDevices.set(body.deviceId, record);
      }

      return ok(record);
    },
  );

  // GET /api/devices — list devices owned by the authenticated user
  app.get(
    '/api/devices',
    {
      preHandler: app.auth,
      schema: {
        response: {
          200: DeviceListResponseSchema,
        },
      },
    },
    async (req) => {
      const uid = req.user!.uid;
      const items = await listDevicesForUser(uid);
      return ok({ items, total: items.length });
    },
  );
};

export default devicesRoutes;
