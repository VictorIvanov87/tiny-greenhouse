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
  temperature: z.number().nullable(),
  humidity: z.number().nullable(),
  soilMoisture: z.number(),
  lightLux: z.number().nullable().optional(),
  pressureHpa: z.number().nullable().optional(),
  lightHours: z.number().optional(),
  sensor: z.string().optional(),
  pumpOn: z.boolean().optional(),
  lightsOn: z.boolean().optional(),
  fanOn: z.boolean().optional(),
  waterLevelLow: z.boolean().optional(),
  sensorError: z.boolean().optional(),
  clockSynced: z.boolean().optional(),
  pumpTriggerPct: z.number().nullable().optional(),
  pumpsToday: z.number().int().nonnegative().nullable().optional(),
  pumpCooldownSec: z.number().int().nonnegative().nullable().optional(),
  pumpLastSkip: z.string().nullable().optional(),
  pumpPulsed: z.boolean().nullable().optional(),
});
export type TelemetrySample = z.infer<typeof TelemetrySample>;

export const TelemetryList = z.object({
  items: z.array(TelemetrySample),
  total: z.number().int().nonnegative(),
});
export type TelemetryList = z.infer<typeof TelemetryList>;
export const TelemetryListResponseSchema = okResponse(TelemetryList);

export const TimelapseFrame = z.object({
  id: z.string(),
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
    timezone: z.string().min(1).default('Europe/Sofia'),
  }),
});
export type GreenhouseConfigType = z.infer<typeof GreenhouseConfig>;
export const GreenhouseConfigResponseSchema = okResponse(GreenhouseConfig);

export const AlertRuleMetric = z.enum(['temperature', 'humidity', 'soilMoisture', 'lightLux']);
export type AlertRuleMetric = z.infer<typeof AlertRuleMetric>;

export const AlertRuleCondition = z.enum(['above', 'below']);
export type AlertRuleCondition = z.infer<typeof AlertRuleCondition>;

export const AlertRule = z.object({
  id: z.string(),
  metric: AlertRuleMetric,
  condition: AlertRuleCondition,
  value: z.number(),
  enabled: z.boolean(),
});
export type AlertRule = z.infer<typeof AlertRule>;

export const NotificationPrefs = z.object({
  email: z.boolean(),
  push: z.boolean(),
  rules: z.array(AlertRule),
  immediate: z.boolean().default(true),
  digestDaily: z.boolean().default(false),
  digestHour: z.number().int().min(0).max(23).default(9),
  quietHours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .nullable()
    .default(null),
});
export type NotificationPrefsType = z.infer<typeof NotificationPrefs>;
export const NotificationPrefsResponseSchema = okResponse(NotificationPrefs);

export const AlertType = z.enum([
  'SOIL_MOISTURE_LOW',
  'SOIL_MOISTURE_HIGH',
  'TEMP_HIGH',
  'TEMP_LOW',
  'HUMIDITY_LOW',
  'HUMIDITY_HIGH',
  'LIGHT_LOW',
  'LIGHT_HIGH',
  'SENSOR_STALE',
  'WATER_LEVEL_LOW',
]);
export type AlertType = z.infer<typeof AlertType>;

export const AlertSeverity = z.enum(['info', 'warn', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertSchema = z.object({
  id: z.string(),
  type: AlertType,
  severity: AlertSeverity,
  message: z.string(),
  startedAt: ISODate,
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
    threadId: z.string().min(1).optional(),
  })
  .strict();
export type AssistRequest = z.infer<typeof AssistRequestSchema>;

export const AssistantMetaSchema = z.object({
  cropId: z.string(),
  lang: z.string(),
  stage: z.string().nullable().optional(),
  intent: z.enum(['gardening', 'general']).optional(),
  imageAttached: z.boolean().optional(),
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
  threadId: z.string(),
  meta: AssistantMetaSchema.optional(),
});
export type AssistantAnswer = z.infer<typeof AssistantAnswerSchema>;
export const AssistantResponseSchema = okResponse(AssistantAnswerSchema);

export const ChatTurnSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: ISODate,
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

const BoundedMetric = z.object({
  min: z.number(),
  max: z.number(),
});

export const CropStageSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  cues: z.array(z.string()).optional(),
  guidance: z.string().optional(),
});

export const CropDefaultsPayloadSchema = z.object({
  cropId: z.string(),
  variety: z.string(),
  lang: z.string(),
  displayName: z.string().nullable(),
  overview: z.string().nullable(),
  defaults: z
    .object({
      environment: z
        .object({
          temperature_day: z.string().optional(),
          temperature_night: z.string().optional(),
          humidity: z.string().optional(),
          light_hours: z.string().optional(),
        })
        .partial()
        .optional(),
      irrigation: z
        .object({
          method: z.string().optional(),
          frequency: z.string().optional(),
          notes: z.string().optional(),
        })
        .partial()
        .optional(),
      container: z
        .object({
          volume_liters: z.string().optional(),
          diameter_cm: z.string().optional(),
          depth_cm: z.string().optional(),
        })
        .partial()
        .optional(),
      operations: z.record(z.string(), z.unknown()).optional(),
    })
    .partial()
    .optional(),
  safety_bounds: z
    .object({
      temperature_c: BoundedMetric.optional(),
      humidity_pct: BoundedMetric.optional(),
      light_hours: BoundedMetric.optional(),
    })
    .partial()
    .optional(),
  stages: z.array(CropStageSchema),
  defaultStage: z.string().nullable().optional(),
});
export type CropDefaultsPayload = z.infer<typeof CropDefaultsPayloadSchema>;
export const CropDefaultsResponseSchema = okResponse(CropDefaultsPayloadSchema);

// --- Device registration ---

export const DeviceType = z.enum(['esp32-main', 'esp32-cam']);
export type DeviceType = z.infer<typeof DeviceType>;

export const DeviceRegistrationBody = z.object({
  deviceId: z.string().min(1),
  greenhouseId: z.string().min(1),
  type: DeviceType,
  name: z.string().min(1).max(100).optional(),
});
export type DeviceRegistrationBody = z.infer<typeof DeviceRegistrationBody>;

export const DeviceRecord = z.object({
  deviceId: z.string(),
  ownerId: z.string(),
  greenhouseId: z.string(),
  type: DeviceType,
  name: z.string(),
  registeredAt: ISODate,
});
export type DeviceRecord = z.infer<typeof DeviceRecord>;

export const DeviceRecordResponseSchema = okResponse(DeviceRecord);

export const DeviceListResult = z.object({
  items: z.array(DeviceRecord),
  total: z.number().int().nonnegative(),
});
export const DeviceListResponseSchema = okResponse(DeviceListResult);

// --- Device test overrides (timed manual on/off; firmware-enforced expiry) ---

export const DeviceOverrideTarget = z.enum(['lights', 'pump', 'fan']);
export type DeviceOverrideTarget = z.infer<typeof DeviceOverrideTarget>;

export const DeviceOverrideState = z.enum(['on', 'off']);
export type DeviceOverrideState = z.infer<typeof DeviceOverrideState>;

export const DeviceOverrideRequest = z.object({
  device: DeviceOverrideTarget,
  state: DeviceOverrideState,
  durationSec: z.number().int().min(1).max(30).default(10),
});
export type DeviceOverrideRequest = z.infer<typeof DeviceOverrideRequest>;

export const DeviceOverrideResult = z.object({
  deviceId: z.string(),
  device: DeviceOverrideTarget,
  state: DeviceOverrideState,
  expiresAt: ISODate,
});
export type DeviceOverrideResult = z.infer<typeof DeviceOverrideResult>;
export const DeviceOverrideResponseSchema = okResponse(DeviceOverrideResult);

// --- Camera sensor settings (pushed to ESP32-CAM via IoT Hub twin desired) ---

export const CameraFramesize = z.enum(['UXGA', 'SXGA', 'XGA', 'SVGA', 'VGA']);
export type CameraFramesize = z.infer<typeof CameraFramesize>;

export const CameraSettings = z.object({
  version: z.number().int().nonnegative(),
  brightness: z.number().int().min(-2).max(2).default(0),
  contrast: z.number().int().min(-2).max(2).default(1),
  saturation: z.number().int().min(-2).max(2).default(0),
  sharpness: z.number().int().min(-2).max(3).default(2),
  denoise: z.number().int().min(0).max(1).default(1),
  whitebal: z.number().int().min(0).max(1).default(1),
  awbGain: z.number().int().min(0).max(1).default(1),
  exposureCtrl: z.number().int().min(0).max(1).default(1),
  gainCtrl: z.number().int().min(0).max(1).default(1),
  specialEffect: z.number().int().min(0).max(6).default(0),
  wbMode: z.number().int().min(0).max(4).default(0),
  framesize: CameraFramesize.default('UXGA'),
  jpegQuality: z.number().int().min(4).max(40).default(4),
});
export type CameraSettingsType = z.infer<typeof CameraSettings>;
export const CameraSettingsResponseSchema = okResponse(CameraSettings);

// --- Camera test capture (ephemeral, no persistence) ---

export const TestCaptureTrigger = z.object({
  lightsOff: z.boolean().default(true),
});
export type TestCaptureTrigger = z.infer<typeof TestCaptureTrigger>;

export const TestCaptureTriggerResult = z.object({
  requestId: z.string(),
  expiresAt: ISODate,
  lightsOffApplied: z.boolean(),
});
export type TestCaptureTriggerResult = z.infer<typeof TestCaptureTriggerResult>;
export const TestCaptureTriggerResponseSchema = okResponse(TestCaptureTriggerResult);

export const TestCaptureStatus = z.object({
  requestId: z.string(),
  status: z.enum(['pending', 'ready', 'expired']),
  imageUrl: z.string().optional(),
  capturedAt: ISODate.optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});
export type TestCaptureStatus = z.infer<typeof TestCaptureStatus>;
export const TestCaptureStatusResponseSchema = okResponse(TestCaptureStatus);

export const TestUploadAck = z.object({
  accepted: z.literal(true),
  requestId: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export const TestUploadAckResponseSchema = okResponse(TestUploadAck);

// --- Telemetry ingestion (POST /api/telemetry) ---

export const TelemetryIngestBody = z.object({
  device_id: z.string().min(1),
  uptime_ms: z.coerce.number().int().nonnegative(),
  temperature_c: z.number().finite().nullable(),
  humidity_pct: z.number().finite().nullable(),
  pressure_hpa: z.number().finite().nullable(),
  light_lux: z.number().finite().nullable(),
  soil_moisture_raw: z.number().finite().nullable(),
  soil_moisture_channels: z.array(z.number().finite()).nullable().optional(),
  pump_on: z.boolean().optional(),
  lights_on: z.boolean().optional(),
  fan_on: z.boolean().optional(),
  water_level_low: z.boolean().optional(),
  sensor_error: z.boolean().optional(),
  clock_synced: z.boolean().optional(),
  pump_trigger_pct: z.number().finite().nullable().optional(),
  pumps_today: z.number().int().nonnegative().optional(),
  pump_cooldown_sec: z.number().int().nonnegative().optional(),
  pump_last_skip: z.string().optional(),
  pump_pulsed: z.boolean().optional(),
});
export type TelemetryIngestBody = z.infer<typeof TelemetryIngestBody>;

export const TelemetryAcceptedSample = z.object({
  deviceId: z.string(),
  uptimeMs: z.number(),
  temperatureC: z.number().nullable(),
  humidityPct: z.number().nullable(),
  pressureHpa: z.number().nullable(),
  lightLux: z.number().nullable(),
  soilMoistureRaw: z.number().nullable(),
  soilMoistureChannels: z.array(z.number()).nullable().optional(),
  pumpOn: z.boolean().optional(),
  lightsOn: z.boolean().optional(),
  fanOn: z.boolean().optional(),
  waterLevelLow: z.boolean().optional(),
  sensorError: z.boolean().optional(),
  clockSynced: z.boolean().optional(),
  pumpTriggerPct: z.number().nullable().optional(),
  pumpsToday: z.number().int().nonnegative().optional(),
  pumpCooldownSec: z.number().int().nonnegative().optional(),
  pumpLastSkip: z.string().optional(),
  pumpPulsed: z.boolean().optional(),
  receivedAt: ISODate,
});
export type TelemetryAcceptedSample = z.infer<typeof TelemetryAcceptedSample>;

export const TelemetryIngestResult = z.object({
  accepted: z.literal(true),
  sample: TelemetryAcceptedSample,
});
export type TelemetryIngestResult = z.infer<typeof TelemetryIngestResult>;
export const TelemetryIngestResponseSchema = okResponse(TelemetryIngestResult);

// --- Control settings (UI source of truth + IoT Hub device twin desired) ---

export const ControlSettings = z
  .object({
    version: z.number().int().nonnegative(),
    thresholds: z
      .object({
        tempMinC: z.number().min(-10).max(60).default(18),
        tempMaxC: z.number().min(-10).max(60),
        humidityMinPct: z.number().min(0).max(100).default(40),
        humidityMaxPct: z.number().min(0).max(100),
        soilMoisturePctMin: z.number().min(0).max(100),
        soilMoisturePctMax: z.number().min(0).max(100),
      })
      .superRefine((t, ctx) => {
        if (t.tempMinC > t.tempMaxC) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'tempMinC must be ≤ tempMaxC',
            path: ['tempMinC'],
          });
        }
        if (t.humidityMinPct > t.humidityMaxPct) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'humidityMinPct must be ≤ humidityMaxPct',
            path: ['humidityMinPct'],
          });
        }
        if (t.soilMoisturePctMin > t.soilMoisturePctMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'soilMoisturePctMin must be ≤ soilMoisturePctMax',
            path: ['soilMoisturePctMin'],
          });
        }
      }),
    lights: z.object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    }),
    fan: z.object({
      periodicEverySec: z.number().int().nonnegative(),
      periodicDurationSec: z.number().int().nonnegative(),
      humidityOverridePct: z.number().min(0).max(100),
    }),
    pump: z.object({
      triggerPct: z.number().min(0).max(100),
      delayAfterMeasurementSec: z.number().int().nonnegative(),
      pulseDurationSec: z.number().int().positive(),
      settleWindowSec: z.number().int().nonnegative(),
      maxPulsesPerDay: z.number().int().positive(),
    }),
  });
export type ControlSettingsType = z.infer<typeof ControlSettings>;
export const ControlSettingsResponseSchema = okResponse(ControlSettings);

// --- Wi-Fi settings (UI source of truth + IoT Hub device twin desired) ---
// Delivered to both boards via the twin `desired.wifi` object. The firmware
// trials the new credentials on reboot and reverts to the last-known-good
// network if they fail. The password is write-only: stored + pushed to the
// twin, but never returned to the browser (see WiFiSettingsPublic).

// Stored / twin representation. ssid may be '' before the user ever configures
// Wi-Fi (devices then run on their compiled secrets.h default).
export const WiFiSettings = z.object({
  version: z.number().int().nonnegative(),
  ssid: z.string().max(32),
  password: z.string().max(63), // may be empty (open network)
});
export type WiFiSettingsType = z.infer<typeof WiFiSettings>;

// GET response — never includes the password.
export const WiFiSettingsPublic = WiFiSettings.omit({ password: true });
export type WiFiSettingsPublicType = z.infer<typeof WiFiSettingsPublic>;
export const WiFiSettingsResponseSchema = okResponse(WiFiSettingsPublic);

// PUT body — a real SSID is required; version is server-assigned.
export const WiFiSettingsInput = z.object({
  ssid: z.string().min(1).max(32),
  password: z.string().max(63),
});
export type WiFiSettingsInputType = z.infer<typeof WiFiSettingsInput>;

// --- Setup completion (POST /api/setup/complete) ---

export const SetupCompleteBody = z
  .object({
    greenhouse: GreenhouseConfig,
    notifications: NotificationPrefs,
  })
  .strict();
export type SetupCompleteBody = z.infer<typeof SetupCompleteBody>;

export const CameraUploadResultSchema = z.object({
  deviceId: z.string(),
  uptimeMs: z.number(),
  sizeBytes: z.number(),
  contentType: z.string(),
  blobPath: z.string(),
  blobUrl: z.string(),
  analysisStatus: z.string(),
  capturedAt: ISODate,
});
export type CameraUploadResult = z.infer<typeof CameraUploadResultSchema>;
export const CameraUploadResponseSchema = okResponse(CameraUploadResultSchema);
