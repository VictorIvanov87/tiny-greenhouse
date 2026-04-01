import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CameraUploadResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { uploadBlob } from '../lib/blob';
import { insertCameraImage } from '../services/camera';
import { lookupDevice } from '../services/telemetry';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';
const UPLOADS_DIR = join(process.cwd(), 'uploads');

const UploadHeaders = z.object({
  'x-device-id': z.string().min(1),
  'x-uptime-ms': z.coerce.number().int().nonnegative(),
  'content-type': z.string().refine(
    (v) => v.startsWith('image/jpeg'),
    { message: 'Content-Type must be image/jpeg' },
  ),
});

/** Sanitise device ID for safe use in blob paths and filenames. */
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
          403: ErrorResponseSchema,
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

      const capturedAt = new Date().toISOString();
      const dateSegment = capturedAt.slice(0, 10); // yyyy-mm-dd
      const safeId = sanitize(deviceId);
      const blobPath = `camera/${safeId}/${dateSegment}.jpg`;

      // ── Mock mode: write to disk, return fabricated blob metadata ──
      if (STORAGE_MODE !== 'firestore') {
        try {
          await mkdir(UPLOADS_DIR, { recursive: true });
          await writeFile(join(UPLOADS_DIR, `${safeId}_${dateSegment}.jpg`), body);
        } catch (err) {
          req.log.error(err, 'Failed to save camera upload to disk');
          return reply.status(500).send(
            errorBody('CAMERA_UPLOAD_FAILED', 'Could not save image'),
          );
        }

        return ok({
          deviceId,
          uptimeMs,
          sizeBytes: body.length,
          contentType: 'image/jpeg',
          blobPath,
          blobUrl: `http://localhost/mock-blob/${blobPath}`,
          analysisStatus: 'pending',
          capturedAt,
        });
      }

      // ── Firestore mode ──

      req.log.info({ deviceId, uptimeMs, sizeBytes: body.length, blobPath }, 'camera upload received');

      // Resolve device ownership
      const ownership = await lookupDevice(deviceId);
      req.log.info({ deviceId, found: !!ownership }, 'device lookup result');
      if (!ownership) {
        return reply.status(403).send(
          errorBody('DEVICE_NOT_REGISTERED', `Device '${deviceId}' is not registered`),
        );
      }

      // Upload to Azure Blob Storage
      req.log.info({ blobPath, container: process.env.AZURE_STORAGE_CONTAINER ?? 'camera-images' }, 'starting Azure Blob upload');
      let blobUrl: string;
      try {
        blobUrl = await uploadBlob(blobPath, body, 'image/jpeg');
        req.log.info({ blobUrl }, 'Azure Blob upload succeeded');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        req.log.error({ message, stack }, 'Azure Blob upload failed');
        return reply.status(500).send(
          errorBody('CAMERA_UPLOAD_FAILED', 'Failed to upload image to Azure Blob Storage'),
        );
      }

      // Persist metadata to Firestore (non-fatal — blob is already stored)
      try {
        await insertCameraImage({
          deviceId,
          ownerId: ownership.ownerId,
          greenhouseId: ownership.greenhouseId,
          uptimeMs,
          capturedAt,
          receivedAt: capturedAt,
          contentType: 'image/jpeg',
          sizeBytes: body.length,
          blobPath,
          blobUrl,
          storageProvider: 'azure-blob',
          analysisStatus: 'pending',
        });
      } catch (err) {
        req.log.error(err, 'Failed to persist camera image metadata to Firestore');
        // Do not fail the request — the blob is stored; metadata can be reconciled later
      }

      return ok({
        deviceId,
        uptimeMs,
        sizeBytes: body.length,
        contentType: 'image/jpeg',
        blobPath,
        blobUrl,
        analysisStatus: 'pending',
        capturedAt,
      });
    },
  );
};

export default cameraRoutes;
