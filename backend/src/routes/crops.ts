import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CropDefaultsResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';
import { getCropDefaults, CropDefaultsNotFoundError } from '../services/crops';

const CropDefaultsParams = z.object({
  cropId: z.string().min(1).regex(/^[a-z0-9-]+$/i),
  variety: z.string().min(1).regex(/^[a-z0-9-]+$/i),
});

const cropsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/crops/:cropId/:variety/defaults',
    {
      attachValidation: true,
      schema: {
        params: CropDefaultsParams,
        response: {
          200: CropDefaultsResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const parsed = CropDefaultsParams.safeParse(req.params);
      if (!parsed.success) {
        reply.code(422);
        throw errorBody('invalid_params', 'Invalid crop or variety parameter');
      }

      const cropId = parsed.data.cropId.toLowerCase();
      const variety = parsed.data.variety.toLowerCase();

      try {
        const payload = await getCropDefaults(cropId, variety);
        return ok(payload);
      } catch (error) {
        if (error instanceof CropDefaultsNotFoundError) {
          reply.code(404);
          throw errorBody('crop_not_found', 'Crop defaults not found');
        }

        req.log.error({ err: error }, 'Failed to load crop defaults');
        reply.code(500);
        throw errorBody('crop_defaults_error', 'Failed to load crop defaults');
      }
    },
  );
};

export default cropsRoutes;
