import { z } from 'zod';

const okResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    ok: z.literal(true),
    data: schema,
  });

const ASSIST_INPUT_LIMIT = Number(process.env.ASSIST_INPUT_LIMIT ?? 800);

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ISODate = z.string().datetime();

export const HealthResponseSchema = okResponse(
  z.object({
    status: z.literal('ok'),
  }),
);
export type HealthResponsePayload = z.infer<typeof HealthResponseSchema>;

export const AiSubsystemStatus = z.object({
  healthy: z.boolean(),
  provider: z.string().optional(),
  message: z.string().optional(),
});

export const AiHealthResponseSchema = okResponse(
  z.object({
    vectorStore: AiSubsystemStatus,
    embeddings: AiSubsystemStatus,
    llm: AiSubsystemStatus,
  }),
);
export type AiHealthResponsePayload = z.infer<typeof AiHealthResponseSchema>;

export const TelemetrySample = z.object({
  timestamp: ISODate,
  temperature: z.number(),
  humidity: z.number(),
  soilMoisture: z.number(),
  lightHours: z.number().optional(),
  sensor: z.string().optional(),
});
export type TelemetrySample = z.infer<typeof TelemetrySample>;

export const TelemetryList = z.object({
  items: z.array(TelemetrySample),
  total: z.number().int().nonnegative(),
});
export type TelemetryList = z.infer<typeof TelemetryList>;
export const TelemetryListResponseSchema = okResponse(TelemetryList);

export const TimelapseFrame = z.object({
  timestamp: ISODate,
  url: z.string(),
});
export const TimelapseList = z.object({
  items: z.array(TimelapseFrame),
  total: z.number().int().nonnegative(),
});
export const TimelapseListResponseSchema = okResponse(TimelapseList);

export const GreenhouseConfig = z.object({
  id: z.string(),
  name: z.string(),
  method: z.enum(['soil', 'nft', 'dwc']),
  plantType: z.string(),
  cropId: z.string().optional(),
  variety: z.string().optional(),
  growthStage: z.string().optional(),
  language: z.enum(['bg', 'en']),
  timelapse: z.object({
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
  }),
});
export type GreenhouseConfigType = z.infer<typeof GreenhouseConfig>;
export const GreenhouseConfigResponseSchema = okResponse(GreenhouseConfig);

export const NotificationPrefs = z.object({
  email: z.boolean(),
  push: z.boolean(),
  thresholds: z.object({
    soilMoistureLow: z.number(),
    tempHigh: z.number(),
  }),
});
export type NotificationPrefsType = z.infer<typeof NotificationPrefs>;
export const NotificationPrefsResponseSchema = okResponse(NotificationPrefs);

export const AlertType = z.enum(['SOIL_MOISTURE_LOW', 'TEMP_HIGH', 'SENSOR_STALE']);
export type AlertType = z.infer<typeof AlertType>;

export const AlertSeverity = z.enum(['info', 'warn', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertSchema = z.object({
  id: z.string(),
  type: AlertType,
  severity: AlertSeverity,
  message: z.string(),
  startedAt: ISODate,
  resolvedAt: ISODate.optional(),
  acknowledged: z.boolean(),
  sensor: z.string().optional(),
  value: z.number().optional(),
  threshold: z.number().optional(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const AlertList = z.object({
  items: z.array(AlertSchema),
  total: z.number().int().nonnegative(),
});
export const AlertListResponseSchema = okResponse(AlertList);

export const RagChunkSchema = z.object({
  id: z.string(),
  cropId: z.string(),
  stage: z.string().nullable().optional(),
  lang: z.string(),
  sourcePath: z.string(),
  chunk: z.string(),
  score: z.number().optional(),
});
export type RagChunk = z.infer<typeof RagChunkSchema>;

export const RagSearchResult = z.object({
  items: z.array(RagChunkSchema),
  total: z.number().int().nonnegative(),
});
export const RagSearchResponseSchema = okResponse(RagSearchResult);

export const AssistRequestSchema = z
  .object({
    message: z.string().min(1).max(ASSIST_INPUT_LIMIT),
    cropId: z.string().min(1).optional(),
    variety: z.string().min(1).optional(),
    topK: z.number().int().min(1).max(12).default(6),
    temperature: z.number().min(0).max(1).default(0.2),
  })
  .strict();
export type AssistRequest = z.infer<typeof AssistRequestSchema>;

export const AssistantMetaSchema = z.object({
  cropId: z.string(),
  lang: z.string(),
  stage: z.string().nullable().optional(),
  options: z
    .object({
      cropId: z.string(),
      variety: z.string().optional(),
      topK: z.number(),
      temperature: z.number(),
    })
    .optional(),
});

export type AssistantMeta = z.infer<typeof AssistantMetaSchema>;

export const AssistantAnswerSchema = z.object({
  message: z.string(),
  sources: z.array(RagChunkSchema),
  meta: AssistantMetaSchema.optional(),
});
export type AssistantAnswer = z.infer<typeof AssistantAnswerSchema>;
export const AssistantResponseSchema = okResponse(AssistantAnswerSchema);
