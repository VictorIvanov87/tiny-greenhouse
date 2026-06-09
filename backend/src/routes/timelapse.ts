import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TimelapseFrame, TimelapseListResponseSchema } from '../lib/schemas';
import { ok } from '../lib/respond';
import { readMock } from '../lib/file';
import { listCameraImages } from '../services/camera';
import { getBlobSasUrl } from '../lib/blob';

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';

const TimelapseQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const timelapseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/timelapse',
    {
      schema: { response: { 200: TimelapseListResponseSchema } },
    },
    async (req) => {
      const query = TimelapseQuery.parse(req.query);

      if (STORAGE_MODE === 'firestore') {
        const images = await listCameraImages({ from: query.from, to: query.to });
        const items = await Promise.all(
          images.map(async (img) => ({
            id: img.id,
            timestamp: img.capturedAt,
            url: await getBlobSasUrl(img.blobPath),
          })),
        );
        return ok({ items, total: items.length });
      }

      // Mock mode: read from JSON, filter by from/to, build absolute URLs
      const raw = TimelapseFrame.omit({ id: true }).array().parse(
        await readMock<unknown>('timelapse.json'),
      );

      const fromMs = query.from ? Date.parse(query.from) : -Infinity;
      const toMs = query.to ? Date.parse(query.to) : Infinity;

      const filtered = raw.filter((f) => {
        const t = Date.parse(f.timestamp);
        return t >= fromMs && t <= toMs;
      });

      const backendBase = `${req.protocol}://${req.headers.host}`;
      const items = filtered.map((f, i) => ({
        id: String(i),
        timestamp: f.timestamp,
        url: `${backendBase}/api/mock/timelapse-frame?n=${i}&ts=${encodeURIComponent(f.timestamp)}`,
      }));
      return ok({ items, total: items.length });
    },
  );
};

export default timelapseRoutes;
