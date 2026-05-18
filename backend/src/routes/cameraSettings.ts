import type { FastifyPluginAsync } from 'fastify';
import {
  CameraSettings,
  CameraSettingsResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { getCameraSettings, setCameraSettings } from '../services/cameraSettings';

const cameraSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/camera-settings',
    {
      preHandler: app.auth,
      schema: { response: { 200: CameraSettingsResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const settings = await getCameraSettings(uid);
      return ok(settings);
    },
  );

  app.put(
    '/api/camera-settings',
    {
      preHandler: app.auth,
      schema: {
        body: CameraSettings.omit({ version: true }).extend({
          version: CameraSettings.shape.version.optional(),
        }),
        response: {
          200: CameraSettingsResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const uid = req.user!.uid;
      const incoming = CameraSettings.parse({
        ...(req.body as object),
        version: 0, // ignored — setCameraSettings bumps from previous
      });
      const result = await setCameraSettings(uid, incoming);

      if (result.twinErrors.length > 0) {
        req.log.warn(
          { twinErrors: result.twinErrors },
          'Camera settings saved to Firestore but twin update failed for some devices',
        );
      }

      return ok(result.settings);
    },
  );
};

export default cameraSettingsRoutes;
