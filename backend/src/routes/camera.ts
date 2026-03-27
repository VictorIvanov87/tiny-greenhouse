import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CameraUploadResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const UploadHeaders = z.object({
  'x-device-id': z.string().min(1),
  'x-uptime-ms': z.coerce.number().int().nonnegative(),
  'content-type': z.string().refine(
    (v) => v.startsWith('image/jpeg'),
    { message: 'Content-Type must be image/jpeg' },
  ),
});

/** Sanitise device ID for safe use in filenames. */
const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

const cameraRoutes: FastifyPluginAsync = async (app) => {
  // Accept raw body for image/jpeg requests on this route
  app.addContentTypeParser(
    'image/jpeg',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  app.post(
    '/api/camera/upload',
    {
      schema: {
        response: {
          200: CameraUploadResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      // Validate headers
      const headerResult = UploadHeaders.safeParse(req.headers);
      if (!headerResult.success) {
        return reply.status(400).send(
          errorBody('INVALID_IMAGE_UPLOAD', headerResult.error.issues[0].message),
        );
      }

      const { 'x-device-id': deviceId, 'x-uptime-ms': uptimeMs } = headerResult.data;

      // Validate body is a non-empty buffer
      const body = req.body as Buffer | undefined;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return reply.status(400).send(
          errorBody('INVALID_IMAGE_UPLOAD', 'Request body must be a JPEG image'),
        );
      }

      const filename = `${sanitize(deviceId)}_${uptimeMs}.jpg`;

      try {
        await mkdir(UPLOADS_DIR, { recursive: true });
        await writeFile(join(UPLOADS_DIR, filename), body);
      } catch (err) {
        req.log.error(err, 'Failed to save camera upload');
        return reply.status(500).send(
          errorBody('UPLOAD_SAVE_FAILED', 'Could not save image to disk'),
        );
      }

      return ok({
        deviceId,
        uptimeMs,
        sizeBytes: body.length,
        filename,
        contentType: 'image/jpeg',
      });
    },
  );
};

export default cameraRoutes;
