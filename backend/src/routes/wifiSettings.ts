import type { FastifyPluginAsync } from 'fastify';
import {
  WiFiSettingsInput,
  WiFiSettingsResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas';
import { ok } from '../lib/respond';
import { getWiFiSettings, setWiFiSettings } from '../services/wifiSettings';

const wifiSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/wifi-settings',
    {
      preHandler: app.auth,
      schema: { response: { 200: WiFiSettingsResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const { password: _password, ...pub } = await getWiFiSettings(uid);
      return ok(pub);
    },
  );

  app.put(
    '/api/wifi-settings',
    {
      preHandler: app.auth,
      schema: {
        body: WiFiSettingsInput,
        response: {
          200: WiFiSettingsResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const uid = req.user!.uid;
      const incoming = WiFiSettingsInput.parse(req.body);
      const result = await setWiFiSettings(uid, incoming);

      if (result.twinErrors.length > 0) {
        req.log.warn(
          { twinErrors: result.twinErrors },
          'Wi-Fi settings saved to Firestore but twin update failed for some devices',
        );
      }

      const { password: _password, ...pub } = result.settings;
      return ok(pub);
    },
  );
};

export default wifiSettingsRoutes;
