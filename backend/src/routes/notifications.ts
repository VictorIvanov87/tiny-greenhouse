import type { FastifyPluginAsync } from 'fastify';
import {
  NotificationPrefs,
  NotificationPrefsResponseSchema,
  NotificationPrefsDataSchema,
  NotificationPrefsType,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { getUserPrefs, setUserPrefs } from '../services/prefs';

const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/notifications',
    {
      preHandler: app.auth,
      schema: { response: { 200: NotificationPrefsResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const prefs = await getUserPrefs(uid);
      return ok(prefs);
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
      setUserPrefs(uid, prefs);
      return ok(prefs);
    },
  );
};

export default notificationRoutes;
