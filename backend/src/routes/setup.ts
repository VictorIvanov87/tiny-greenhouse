import type { FastifyPluginAsync } from 'fastify';
import { SetupCompleteBody, GreenhouseConfigResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { saveGreenhouseConfig } from '../services/greenhouse';
import { setUserPrefs } from '../services/prefs';

const setupRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/setup/complete',
    {
      preHandler: app.auth,
      schema: {
        body: SetupCompleteBody,
        response: { 200: GreenhouseConfigResponseSchema },
      },
    },
    async (req) => {
      const { greenhouse, notifications } = SetupCompleteBody.parse(req.body);
      const uid = req.user!.uid;

      const saved = await saveGreenhouseConfig(uid, greenhouse);
      await setUserPrefs(uid, notifications);

      return ok(saved);
    },
  );
};

export default setupRoutes;
