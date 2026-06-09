import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const FrameQuery = z.object({
  n: z.coerce.number().int().min(0).default(0),
  ts: z.string().optional(),
});

/** Palette cycles through 8 shades of green so mock frames look distinct. */
const GREENS = [
  '#1a4a1a', '#1e5a1e', '#163e16', '#1d5c2a',
  '#185218', '#214d21', '#154215', '#1b5730',
];

const makeSvg = (n: number, ts?: string): string => {
  const bg = GREENS[n % GREENS.length];
  const label = ts ? new Date(ts).toLocaleDateString() : `Frame ${n + 1}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <rect width="320" height="240" fill="${bg}"/>
  <rect x="20" y="20" width="280" height="200" rx="12" fill="${bg}" stroke="#4a9a4a" stroke-width="1.5" opacity="0.6"/>
  <ellipse cx="160" cy="90" rx="55" ry="65" fill="#2d7a2d" opacity="0.7"/>
  <ellipse cx="110" cy="110" rx="38" ry="50" fill="#287028" opacity="0.6"/>
  <ellipse cx="210" cy="105" rx="42" ry="55" fill="#306830" opacity="0.6"/>
  <rect x="130" y="148" width="18" height="42" rx="4" fill="#5a3a1a"/>
  <rect x="160" y="148" width="14" height="36" rx="3" fill="#5a3a1a" opacity="0.8"/>
  <text x="160" y="212" fill="#a0e0a0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${label}</text>
  <text x="160" y="228" fill="#609060" font-family="sans-serif" font-size="9" text-anchor="middle">mock timelapse · tiny greenhouse</text>
</svg>`;
};

export const MOCK_CAPTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <rect width="320" height="240" fill="#1a4a1a"/>
  <rect x="20" y="20" width="280" height="200" rx="12" fill="#1a4a1a" stroke="#4a9a4a" stroke-width="1.5" opacity="0.6"/>
  <ellipse cx="160" cy="90" rx="55" ry="65" fill="#2d7a2d" opacity="0.7"/>
  <ellipse cx="110" cy="110" rx="38" ry="50" fill="#287028" opacity="0.6"/>
  <ellipse cx="210" cy="105" rx="42" ry="55" fill="#306830" opacity="0.6"/>
  <rect x="130" y="148" width="18" height="42" rx="4" fill="#5a3a1a"/>
  <rect x="160" y="148" width="14" height="36" rx="3" fill="#5a3a1a" opacity="0.8"/>
  <text x="160" y="210" fill="#a0e0a0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Test capture</text>
  <text x="160" y="228" fill="#609060" font-family="sans-serif" font-size="9" text-anchor="middle">mock image · tiny greenhouse</text>
</svg>`;

const mockImagesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/mock/timelapse-frame',
    {
      schema: {
        querystring: FrameQuery,
      },
    },
    (req, reply) => {
      const { n, ts } = FrameQuery.parse(req.query);
      const svg = makeSvg(n, ts);
      reply
        .header('Content-Type', 'image/svg+xml')
        .header('Cache-Control', 'public, max-age=3600')
        .send(svg);
    },
  );
};

export default mockImagesRoutes;
