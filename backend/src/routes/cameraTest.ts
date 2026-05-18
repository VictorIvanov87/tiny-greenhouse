import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  ErrorResponseSchema,
  TestCaptureStatusResponseSchema,
  TestCaptureTrigger,
  TestCaptureTriggerResponseSchema,
} from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { assertDeviceOwnership, DeviceOwnershipError } from '../services/devices';
import { triggerCapture } from '../services/cameraTrigger';
import { getImage, getStatus } from '../services/cameraTestStore';

const DeviceParam = z.object({ deviceId: z.string().min(1) });
const RequestParam = z.object({ requestId: z.string().min(1) });

const cameraTestRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/cameras/:deviceId/test-capture
  app.post(
    '/api/cameras/:deviceId/test-capture',
    {
      preHandler: app.auth,
      schema: {
        params: DeviceParam,
        body: TestCaptureTrigger,
        response: {
          200: TestCaptureTriggerResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { deviceId } = DeviceParam.parse(req.params);
      const body = TestCaptureTrigger.parse(req.body ?? {});
      const uid = req.user!.uid;

      let device;
      try {
        device = await assertDeviceOwnership(uid, deviceId);
      } catch (err) {
        if (err instanceof DeviceOwnershipError) {
          return reply.status(err.status).send(errorBody(err.code, err.message));
        }
        throw err;
      }

      if (device.type !== 'esp32-cam') {
        return reply
          .status(400)
          .send(errorBody('NOT_A_CAMERA', `Device ${deviceId} is not a camera`));
      }

      try {
        const result = await triggerCapture({
          ownerId: uid,
          camDeviceId: deviceId,
          kind: 'test_capture',
          uploadPath: '/api/camera/test-upload',
          lightsOff: body.lightsOff,
        });

        req.log.info(
          {
            deviceId,
            requestId: result.requestId,
            lightsOffApplied: result.lightsOffApplied,
          },
          'Test capture triggered',
        );

        return ok({
          requestId: result.requestId,
          expiresAt: result.expiresAt.toISOString(),
          lightsOffApplied: result.lightsOffApplied,
        });
      } catch (err) {
        req.log.error({ err, deviceId }, 'Failed to trigger test capture');
        return reply
          .status(500)
          .send(errorBody('TWIN_UPDATE_FAILED', 'Failed to deliver capture command to camera'));
      }
    },
  );

  // GET /api/cameras/test-capture/:requestId
  app.get(
    '/api/cameras/test-capture/:requestId',
    {
      preHandler: app.auth,
      schema: {
        params: RequestParam,
        response: {
          200: TestCaptureStatusResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { requestId } = RequestParam.parse(req.params);
      const uid = req.user!.uid;

      const status = getStatus(requestId, uid);
      if (!status) {
        // Hide existence from non-owners.
        return reply
          .status(404)
          .send(errorBody('NOT_FOUND', 'Test capture not found'));
      }

      if (status.status === 'ready') {
        return ok({
          requestId,
          status: 'ready' as const,
          imageUrl: `/api/cameras/test-capture/${encodeURIComponent(requestId)}/image`,
          capturedAt: status.capturedAt,
          sizeBytes: status.sizeBytes,
        });
      }

      return ok({ requestId, status: status.status });
    },
  );

  // GET /api/cameras/test-capture/:requestId/image
  app.get(
    '/api/cameras/test-capture/:requestId/image',
    {
      preHandler: app.auth,
      schema: { params: RequestParam },
    },
    async (req, reply) => {
      const { requestId } = RequestParam.parse(req.params);
      const uid = req.user!.uid;

      const stored = getImage(requestId, uid);
      if (!stored) {
        return reply
          .status(404)
          .send(errorBody('NOT_FOUND', 'Test capture image not available'));
      }

      reply
        .header('Content-Type', stored.contentType)
        .header('Content-Length', String(stored.sizeBytes))
        .header('Cache-Control', 'private, max-age=0, no-store')
        .send(stored.buffer);
      return reply;
    },
  );
};

export default cameraTestRoutes;
