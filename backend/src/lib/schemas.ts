import { z } from 'zod';

const okEnvelope = <T extends Record<string, unknown>>(data: T) =>
  ({
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'data'],
    properties: {
      ok: { const: true },
      data,
    },
  }) as const;

const isoDateJsonSchema = { type: 'string', format: 'date-time' } as const;

export const ISODate = z.string().datetime();

export const HealthResponse = z.object({
  ok: z.literal(true),
  data: z.object({
    status: z.literal('ok'),
  }),
});
export type HealthResponsePayload = z.infer<typeof HealthResponse>;
export const HealthResponseSchema = okEnvelope({
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { const: 'ok' },
  },
});

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

const telemetrySampleJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['timestamp', 'temperature', 'humidity', 'soilMoisture'],
  properties: {
    timestamp: isoDateJsonSchema,
    temperature: { type: 'number' },
    humidity: { type: 'number' },
    soilMoisture: { type: 'number' },
    lightHours: { type: 'number' },
    sensor: { type: 'string' },
  },
} as const;

const telemetryListDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'total'],
  properties: {
    items: {
      type: 'array',
      items: telemetrySampleJsonSchema,
    },
    total: { type: 'number' },
  },
} as const;

export const TelemetryListResponseSchema = okEnvelope(telemetryListDataSchema);
export const TelemetryListDataSchema = telemetryListDataSchema;

export const TimelapseFrame = z.object({
  timestamp: ISODate,
  url: z.string(),
});
export const TimelapseList = z.object({
  items: z.array(TimelapseFrame),
  total: z.number().int().nonnegative(),
});

const timelapseFrameJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['timestamp', 'url'],
  properties: {
    timestamp: isoDateJsonSchema,
    url: { type: 'string' },
  },
} as const;

const timelapseListDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'total'],
  properties: {
    items: { type: 'array', items: timelapseFrameJsonSchema },
    total: { type: 'number' },
  },
} as const;

export const TimelapseListResponseSchema = okEnvelope(timelapseListDataSchema);
export const TimelapseListDataSchema = timelapseListDataSchema;

export const GreenhouseConfig = z.object({
  id: z.string(),
  name: z.string(),
  method: z.enum(['soil', 'nft', 'dwc']),
  plantType: z.string(),
  language: z.enum(['bg', 'en']),
  timelapse: z.object({
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
  }),
});

const greenhouseConfigDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'method', 'plantType', 'language', 'timelapse'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    method: { enum: ['soil', 'nft', 'dwc'] },
    plantType: { type: 'string' },
    language: { enum: ['bg', 'en'] },
    timelapse: {
      type: 'object',
      additionalProperties: false,
      required: ['enabled', 'hour'],
      properties: {
        enabled: { type: 'boolean' },
        hour: { type: 'number', minimum: 0, maximum: 23 },
      },
    },
  },
} as const;

export const GreenhouseConfigResponseSchema = okEnvelope(greenhouseConfigDataSchema);
export const GreenhouseConfigDataSchema = greenhouseConfigDataSchema;
export type GreenhouseConfigType = z.infer<typeof GreenhouseConfig>;

export const NotificationPrefs = z.object({
  email: z.boolean(),
  push: z.boolean(),
  thresholds: z.object({
    soilMoistureLow: z.number(),
    tempHigh: z.number(),
  }),
});

const notificationPrefsDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'push', 'thresholds'],
  properties: {
    email: { type: 'boolean' },
    push: { type: 'boolean' },
    thresholds: {
      type: 'object',
      additionalProperties: false,
      required: ['soilMoistureLow', 'tempHigh'],
      properties: {
        soilMoistureLow: { type: 'number' },
        tempHigh: { type: 'number' },
      },
    },
  },
} as const;

export const NotificationPrefsResponseSchema = okEnvelope(notificationPrefsDataSchema);
export const NotificationPrefsDataSchema = notificationPrefsDataSchema;
export type NotificationPrefsType = z.infer<typeof NotificationPrefs>;

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

const alertJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'severity', 'message', 'startedAt', 'acknowledged'],
  properties: {
    id: { type: 'string' },
    type: { enum: ['SOIL_MOISTURE_LOW', 'TEMP_HIGH', 'SENSOR_STALE'] },
    severity: { enum: ['info', 'warn', 'critical'] },
    message: { type: 'string' },
    startedAt: isoDateJsonSchema,
    resolvedAt: isoDateJsonSchema,
    acknowledged: { type: 'boolean' },
    sensor: { type: 'string' },
    value: { type: 'number' },
    threshold: { type: 'number' },
  },
} as const;

const alertListDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'total'],
  properties: {
    items: {
      type: 'array',
      items: alertJsonSchema,
    },
    total: { type: 'number' },
  },
} as const;

export const AlertListResponseSchema = okEnvelope(alertListDataSchema);
export const AlertListDataSchema = alertListDataSchema;
