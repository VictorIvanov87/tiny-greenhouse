import type { FastifyPluginAsync } from 'fastify';
import {
  NotificationPrefs,
  NotificationPrefsResponseSchema,
  NotificationPrefsDataSchema,
  NotificationPrefsType,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

const cacheByUser: Record<string, NotificationPrefsType> = {};

const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/notifications',
    {
      preHandler: app.auth,
      schema: { response: { 200: NotificationPrefsResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      if (!cacheByUser[uid]) {
        cacheByUser[uid] = NotificationPrefs.parse(
          await readMock<unknown>('notifications.json'),
        );
      }
      return ok(cacheByUser[uid]);
    },
  );

  app.put(
    '/api/notifications',
    {
      preHandler: app.auth,
      schema: {
        body: NotificationPrefsDataSchema,
        response: { 200: NotificationPrefsResponseSchema },
      },
    },
    async (req) => {
      const prefs = NotificationPrefs.parse(req.body);
      const uid = req.user!.uid;
      cacheByUser[uid] = prefs;
      return ok(cacheByUser[uid]);
    },
  );
};

export default notificationRoutes;
