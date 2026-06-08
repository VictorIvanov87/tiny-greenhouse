import {
  AssistantAnswerSchema,
  type AssistantAnswer,
  type ChatTurn,
  type GreenhouseConfigType,
} from '../lib/schemas';
import { getGreenhouseConfig } from './greenhouse';
import {
  getLatestTelemetry,
  getTelemetryAggregates,
  type TelemetryAggregate,
  type TelemetryMetricKey,
} from './telemetry';
import { retrieveChunks } from './rag';
import { listCameraImages } from './camera';
import { getBlobSasUrl } from '../lib/blob';
import { getChatProvider, type ChatMessage, type ToolDef, type ToolHandler } from '../ai/providers';
import {
  appendTurn,
  assertThreadOwnership,
  createConversation,
  getTurns,
} from './conversations';

const sanitizeCropId = (value?: string | null) => (value && value.trim() ? value.trim() : 'unknown');
const sanitizeOptional = (value?: string | null) => (value && value.trim() ? value.trim() : undefined);

const DEFAULT_TOP_K = 6;
const DEFAULT_TEMPERATURE = 0.2;
const HISTORY_TURN_LIMIT = 12;
const CAMERA_FRESHNESS_MS = 24 * 60 * 60 * 1000;
const SHOULD_INCLUDE_OPTIONS_IN_META = process.env.RAG_DEBUG === 'true';

type RagChunk = Awaited<ReturnType<typeof retrieveChunks>>[number];

const formatAge = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

type AssistOptions = {
  cropId?: string;
  variety?: string;
  topK?: number;
  temperature?: number;
  threadId?: string;
};

export type AssistContext = {
  greenhouse: GreenhouseConfigType;
  cropId: string;
  lang: string;
  stage: string | null;
};

export const resolveAssistContext = async (uid: string): Promise<AssistContext> => {
  const greenhouse = await getGreenhouseConfig(uid);
  const cropId = sanitizeCropId(greenhouse.cropId ?? greenhouse.plantType);
  const lang = greenhouse.language ?? 'en';
  const stage = greenhouse.growthStage ?? null;
  return { greenhouse, cropId, lang, stage };
};

const ensureThread = async (uid: string, requestedThreadId?: string): Promise<string> => {
  if (requestedThreadId) {
    const owned = await assertThreadOwnership(requestedThreadId, uid);
    if (owned) return requestedThreadId;
  }
  const { threadId } = await createConversation(uid);
  return threadId;
};

const turnsToChatMessages = (turns: ChatTurn[]): ChatMessage[] =>
  turns.map<ChatMessage>((t) =>
    t.role === 'user'
      ? { role: 'user', content: t.content }
      : { role: 'assistant', content: t.content },
  );

// ── Tool: get_telemetry_aggregates ────────────────────────────────────────

const telemetryAggregatesTool: ToolDef = {
  name: 'get_telemetry_aggregates',
  description:
    'Fetch sensor history aggregates (min/max/avg per metric) over a time window. ' +
    'Use this when the user asks about trends, averages, or what happened over the last hours/days/weeks.',
  parameters: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'ISO 8601 timestamp for the start of the window' },
      to: { type: 'string', description: 'ISO 8601 timestamp for the end of the window' },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['temperature', 'humidity', 'soilMoisture', 'lightLux', 'pressureHpa'],
        },
        description: 'Optional subset of metrics to include. Omit for all metrics.',
      },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  },
};

const makeTelemetryAggregatesHandler = (uid: string): ToolHandler => async (args) => {
  const from = typeof args.from === 'string' ? args.from : '';
  const to = typeof args.to === 'string' ? args.to : '';
  const metrics = Array.isArray(args.metrics)
    ? (args.metrics.filter((m) => typeof m === 'string') as TelemetryMetricKey[])
    : undefined;
  return getTelemetryAggregates(uid, from, to, metrics);
};

// ── Tool: search_crop_guidance (on-demand RAG) ────────────────────────────

const cropGuidanceTool: ToolDef = {
  name: 'search_crop_guidance',
  description:
    'Search the crop-specific knowledge base for target ranges and care guidance ' +
    '(ideal temperature, humidity, soil moisture, light, watering, nutrition, pests, stage tips) ' +
    'for THIS greenhouse\'s crop. Call this whenever you need ideal/target values to ASSESS a ' +
    'reading or to DIAGNOSE a problem. You do NOT need it to simply report a current sensor value.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'What guidance you need, e.g. "ideal temperature range for the vegetative stage" or ' +
          '"causes of yellowing leaves".',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

type GuidanceParams = { cropId: string; lang: string; stage: string | null; topK: number };

const makeCropGuidanceHandler = (
  params: GuidanceParams,
  collect: (chunks: RagChunk[]) => void,
): ToolHandler => async (args) => {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { error: 'query is required' };

  const chunks = await retrieveChunks({
    query,
    cropId: params.cropId,
    lang: params.lang,
    stage: params.stage,
    topK: params.topK,
  });
  collect(chunks);

  if (!chunks.length) {
    return {
      matches: [],
      note: 'No crop-specific guidance matched. Say so plainly instead of inventing target ranges.',
    };
  }
  return {
    matches: chunks.map((c, idx) => ({
      ref: `Source ${idx + 1}`,
      source: c.sourcePath,
      stage: c.stage,
      text: c.chunk,
    })),
  };
};

// ── Context formatting ────────────────────────────────────────────────────

const METRIC_UNITS: Record<TelemetryMetricKey, string> = {
  temperature: '°C',
  humidity: '%',
  soilMoisture: '%',
  lightLux: ' lux',
  pressureHpa: ' hPa',
};

const formatAggregateLine = (
  label: string,
  agg: TelemetryAggregate,
): string => {
  if (!agg.sampleCount) return `${label}: no samples in window`;
  const parts: string[] = [];
  for (const key of Object.keys(agg.perMetric) as TelemetryMetricKey[]) {
    const v = agg.perMetric[key];
    if (!v) continue;
    const unit = METRIC_UNITS[key];
    parts.push(`${key} min ${v.min}${unit} / avg ${v.avg}${unit} / max ${v.max}${unit}`);
  }
  return `${label} (${agg.sampleCount} samples): ${parts.join('; ')}`;
};

const buildSnapshotBlock = (
  greenhouse: GreenhouseConfigType,
  cropId: string,
  variety: string | undefined,
  stage: string | null,
  telemetry: Awaited<ReturnType<typeof getLatestTelemetry>>,
  last24h: TelemetryAggregate,
  last14d: TelemetryAggregate,
): string => {
  const lines: string[] = [
    `Greenhouse: ${greenhouse.name} (${greenhouse.id})`,
    `Crop: ${cropId}${variety ? ` / ${variety}` : ''}`,
    `Stage: ${stage ?? 'unspecified'}`,
    `Method: ${greenhouse.method}`,
  ];
  if (telemetry) {
    const age = formatAge(Date.now() - Date.parse(telemetry.timestamp));
    lines.push(
      `Latest reading: ${age} (recorded ${telemetry.timestamp})`,
      `Temperature: ${telemetry.temperature}°C`,
      `Humidity: ${telemetry.humidity}%`,
      `Soil moisture: ${telemetry.soilMoisture}%`,
    );
    if (typeof telemetry.lightLux === 'number') lines.push(`Light: ${telemetry.lightLux} lux`);
    if (telemetry.waterLevelLow) lines.push('Water reservoir: LOW');
    if (telemetry.sensorError) lines.push('Sensor error flag: TRUE');
  } else {
    lines.push('No telemetry samples recorded yet.');
  }
  lines.push('');
  lines.push(formatAggregateLine('Last 24h', last24h));
  lines.push(formatAggregateLine('Last 14d', last14d));
  return lines.join('\n');
};

// ── Main entry point ──────────────────────────────────────────────────────

export const buildAssistantAnswer = async (
  uid: string,
  message: string,
  options: AssistOptions = {},
): Promise<AssistantAnswer> => {
  const trimmedMessage = message.trim();
  const { greenhouse, cropId: baseCropId, lang, stage } = await resolveAssistContext(uid);

  const effectiveCropId = sanitizeCropId(options.cropId ?? baseCropId);
  const effectiveVariety = sanitizeOptional(options.variety) ?? sanitizeOptional(greenhouse.variety);
  const topK = options.topK ?? DEFAULT_TOP_K;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;

  const threadId = await ensureThread(uid, options.threadId);
  const history = await getTurns(threadId, HISTORY_TURN_LIMIT);

  const buildMeta = (imageAttached: boolean) => ({
    cropId: effectiveCropId,
    lang,
    stage,
    imageAttached,
    ...(SHOULD_INCLUDE_OPTIONS_IN_META
      ? {
          options: {
            cropId: effectiveCropId,
            variety: effectiveVariety,
            topK,
            temperature,
          },
        }
      : {}),
  });

  // Persist the user turn early so it appears in subsequent fetches.
  await appendTurn(threadId, { role: 'user', content: trimmedMessage });

  const llm = getChatProvider();

  // ── Assemble context for every prompt ────────────────────────────────
  const nowMs = Date.now();
  const last24hFrom = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const last14dFrom = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(nowMs).toISOString();

  // Telemetry + camera are always assembled (cheap, cached, and always relevant).
  // Crop guidance (RAG) is fetched on demand via the search_crop_guidance tool.
  const [telemetry, cameraImages, last24h, last14d] = await Promise.all([
    getLatestTelemetry(uid),
    listCameraImages().then((list) => list.slice(0, 1)),
    getTelemetryAggregates(uid, last24hFrom, nowIso),
    getTelemetryAggregates(uid, last14dFrom, nowIso),
  ]);

  const latestImage = cameraImages[0];
  const imageAgeMs = latestImage ? Date.now() - Date.parse(latestImage.capturedAt) : Infinity;
  const imageIsFresh = imageAgeMs < CAMERA_FRESHNESS_MS;
  const imageNote = latestImage
    ? imageIsFresh
      ? `A photo of the plant taken ${formatAge(imageAgeMs)} is attached. It shows plant appearance only — read no numbers from it.`
      : `A photo of the plant taken ${formatAge(imageAgeMs)} is attached, but it is over 24 hours old.`
    : 'No camera image is available.';
  const latestImageUrl = latestImage ? await getBlobSasUrl(latestImage.blobPath) : undefined;

  const snapshotBlock = buildSnapshotBlock(
    greenhouse,
    effectiveCropId,
    effectiveVariety,
    stage,
    telemetry,
    last24h,
    last14d,
  );

  const systemPrompt = [
    `You are the Tiny Greenhouse assistant for THIS specific greenhouse. The current time is ${new Date().toISOString()}.`,
    '',
    'What you are given every turn:',
    '- SNAPSHOT: the authoritative, live sensor readings from this greenhouse\'s own hardware',
    '  (current temperature, humidity, soil moisture, light, plus last-24h and last-14d aggregates).',
    '  These ARE the current values — trust them and state them directly. The "Latest reading" line',
    '  tells you how fresh they are.',
    '- CAMERA: a recent photo of the plant, when available. It shows plant APPEARANCE only. NEVER read',
    '  temperature, humidity, or any numeric value from the photo — all numbers come ONLY from SNAPSHOT.',
    '',
    'Tools (call only when needed):',
    '- search_crop_guidance(query): fetch crop-specific target ranges / care advice. Call it whenever',
    '  you need ideal values to ASSESS a reading or DIAGNOSE a problem. Not needed to merely report a value.',
    '- get_telemetry_aggregates(from, to, metrics?): sensor history for time windows other than 24h/14d.',
    '',
    'How to answer:',
    '- Direct data question ("what is the current temperature?"): answer from SNAPSHOT in one line.',
    '  Do NOT call tools, do NOT run a diagnosis, do NOT look at the photo.',
    '- Assessment / problem ("is the temperature ok?", "why are the leaves yellowing?"):',
    '  1. Call search_crop_guidance to get target ranges for this crop and stage; quote the numbers, cite "Source N".',
    '  2. Compare them to the SNAPSHOT values AND the 24h/14d aggregates; state the gap in numbers and the trend.',
    '  3. Conclude the most likely cause first, then give 1–3 concrete, sensor-specific next actions.',
    '',
    'Hard constraints:',
    '- SNAPSHOT is your sensor feed. NEVER ask the user to provide, share, or confirm sensor readings — you already have them.',
    '- If the latest reading is old, say "the most recent reading, <age>, was …" — still never ask the user for data.',
    '- NEVER produce a generic "could be X, could be Y" list when SNAPSHOT data is present. Commit to a diagnosis grounded in the numbers.',
    '- If search_crop_guidance returns no target range you need, say so plainly instead of inventing one.',
    '- If you need a visual detail you cannot see in the photo, ask ONE focused question (max one per turn).',
    '- If the message is unrelated to the greenhouse (small talk, general knowledge, jokes), answer it briefly,',
    '  then offer to return to their plants or sensors. Do not force the diagnostic framing or invent readings.',
    '- Be concise.',
    `Respond in ${lang.toUpperCase()}.`,
  ].join('\n');

  const contextBlock = [
    'SNAPSHOT:',
    snapshotBlock,
    '',
    'CAMERA:',
    imageNote,
  ].join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: contextBlock },
    ...turnsToChatMessages(history),
    { role: 'user', content: trimmedMessage },
  ];

  // Crop guidance is retrieved on demand; collect whatever the model pulls so the
  // UI can show the sources it actually used (deduped by chunk id, capped).
  const collectedById = new Map<string, RagChunk>();
  const collectSources = (chunks: RagChunk[]) => {
    for (const c of chunks) if (!collectedById.has(c.id)) collectedById.set(c.id, c);
  };

  const completion = await llm.complete({
    messages,
    images: latestImageUrl ? [latestImageUrl] : undefined,
    tools: [cropGuidanceTool, telemetryAggregatesTool],
    toolHandlers: {
      search_crop_guidance: makeCropGuidanceHandler(
        { cropId: effectiveCropId, lang, stage, topK },
        collectSources,
      ),
      get_telemetry_aggregates: makeTelemetryAggregatesHandler(uid),
    },
    temperature,
  });

  await appendTurn(threadId, { role: 'assistant', content: completion });

  return AssistantAnswerSchema.parse({
    message: completion,
    sources: [...collectedById.values()],
    threadId,
    meta: buildMeta(Boolean(latestImage)),
  });
};
