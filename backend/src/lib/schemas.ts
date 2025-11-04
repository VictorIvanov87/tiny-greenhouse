import { z } from 'zod';

export const HealthResponse = z.object({
  ok: z.literal(true),
  data: z.object({
    status: z.literal('ok'),
  }),
});

export type HealthResponsePayload = z.infer<typeof HealthResponse>;

export const HealthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: { const: 'ok' },
      },
    },
  },
} as const;
