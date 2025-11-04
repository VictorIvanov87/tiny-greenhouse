import type { FastifyPluginAsync } from 'fastify';
import {
  NotificationPrefs,
  NotificationPrefsResponseSchema,
  NotificationPrefsDataSchema,
  NotificationPrefsType,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';

let cache: NotificationPrefsType | null = null;

const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/notifications',
    {
      schema: { response: { 200: NotificationPrefsResponseSchema } },
    },
    async () => {
      if (!cache) {
        cache = NotificationPrefs.parse(
          await readMock<unknown>('notifications.json'),
        );
      }
      return ok(cache);
    },
  );

  app.put(
    '/api/notifications',
    {
      schema: {
        body: NotificationPrefsDataSchema,
        response: { 200: NotificationPrefsResponseSchema },
      },
    },
    async (req) => {
      const prefs = NotificationPrefs.parse(req.body);
      cache = prefs;
      return ok(cache);
    },
  );
};

export default notificationRoutes;
