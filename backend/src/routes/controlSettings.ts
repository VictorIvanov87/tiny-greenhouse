import type { FastifyPluginAsync } from 'fastify';
import {
  ControlSettings,
  ControlSettingsResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { getControlSettings, setControlSettings } from '../services/controlSettings';

const controlSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/control-settings',
    {
      preHandler: app.auth,
      schema: { response: { 200: ControlSettingsResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const settings = await getControlSettings(uid);
      return ok(settings);
    },
  );

  app.put(
    '/api/control-settings',
    {
      preHandler: app.auth,
      schema: {
        body: ControlSettings.omit({ version: true }).extend({
          version: ControlSettings.shape.version.optional(),
        }),
        response: {
          200: ControlSettingsResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const uid = req.user!.uid;
      const incoming = ControlSettings.parse({
        ...(req.body as object),
        version: 0, // ignored — setControlSettings bumps from previous
      });
      const result = await setControlSettings(uid, incoming);

      if (result.twinErrors.length > 0) {
        req.log.warn(
          { twinErrors: result.twinErrors },
          'Control settings saved to Firestore but twin update failed for some devices',
        );
      }

      return ok(result.settings);
    },
  );
};

export default controlSettingsRoutes;
