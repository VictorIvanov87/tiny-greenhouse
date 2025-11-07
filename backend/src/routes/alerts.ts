import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AlertListResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import {
  acknowledgeAlert,
  getActiveAlerts,
  getAlertHistory,
  recomputeAlerts,
} from '../services/alerts';

const alertsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/alerts',
    {
      preHandler: app.auth,
      schema: { response: { 200: AlertListResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      await recomputeAlerts(uid);
      const items = getActiveAlerts(uid);
      return ok({ items, total: items.length });
    },
  );

  app.get(
    '/api/alerts/history',
    {
      preHandler: app.auth,
      schema: { response: { 200: AlertListResponseSchema } },
    },
    async (req) => {
      const uid = req.user!.uid;
      const query = z
        .object({
          limit: z.coerce.number().int().min(1).max(500).default(100),
        })
        .parse(req.query);

      const items = getAlertHistory(uid, query.limit);
      return ok({ items, total: items.length });
    },
  );

  app.post(
    '/api/alerts/:id/ack',
    {
      preHandler: app.auth,
    },
    async (req) => {
      const uid = req.user!.uid;
      const params = z.object({ id: z.string() }).parse(req.params);
      acknowledgeAlert(uid, params.id);
      return ok({ id: params.id });
    },
  );
};

export default alertsRoutes;
