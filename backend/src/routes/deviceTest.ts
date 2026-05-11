import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  DeviceOverrideRequest,
  DeviceOverrideResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { assertDeviceOwnership, DeviceOwnershipError } from '../services/devices';
import { updateDeviceTwinDesired } from '../lib/iothub';

const ParamsSchema = z.object({
  deviceId: z.string().min(1),
});

const deviceTestRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/devices/:deviceId/test-override',
    {
      preHandler: app.auth,
      schema: {
        params: ParamsSchema,
        body: DeviceOverrideRequest,
        response: {
          200: DeviceOverrideResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { deviceId } = ParamsSchema.parse(req.params);
      const body = DeviceOverrideRequest.parse(req.body);
      const uid = req.user!.uid;

      try {
        await assertDeviceOwnership(uid, deviceId);
      } catch (err) {
        if (err instanceof DeviceOwnershipError) {
          return reply.status(err.status).send(errorBody(err.code, err.message));
        }
        throw err;
      }

      const expiresAtMs = Date.now() + body.durationSec * 1000;
      const patch = {
        overrides: {
          [body.device]: {
            state: body.state,
            expiresAtMs,
          },
        },
      };

      try {
        await updateDeviceTwinDesired(deviceId, patch);
      } catch (err) {
        req.log.error({ err, deviceId }, 'Failed to push device test override to twin');
        return reply
          .status(500)
          .send(errorBody('TWIN_UPDATE_FAILED', 'Failed to deliver override to device'));
      }

      req.log.info(
        { deviceId, device: body.device, state: body.state, durationSec: body.durationSec },
        'Device test override scheduled',
      );

      return ok({
        deviceId,
        device: body.device,
        state: body.state,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    },
  );
};

export default deviceTestRoutes;
