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

const numberFromEnv = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MIN_QUERY_LENGTH = Math.max(1, numberFromEnv(process.env.ASSIST_MIN_QUERY_LEN, 8));
const DEFAULT_TOP_K = 6;
const DEFAULT_TEMPERATURE = 0.2;
const HISTORY_TURN_LIMIT = 12;
const CAMERA_FRESHNESS_MS = 24 * 60 * 60 * 1000;
const SHOULD_INCLUDE_OPTIONS_IN_META = process.env.RAG_DEBUG === 'true';

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

const classifyIntent = async (
  message: string,
  history: ChatTurn[],
): Promise<'gardening' | 'general'> => {
  if (message.trim().length < MIN_QUERY_LENGTH) return 'general';

  const llm = getChatProvider();
  const historyTail = history.slice(-4);
  const transcript = historyTail
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join('\n');

  const systemPrompt = [
    'You are a strict binary classifier for a greenhouse assistant.',
    'Output EXACTLY one token: GARDENING or GENERAL.',
    '',
    'GARDENING covers: plants, watering, light, soil, pests, growth, nutrition, harvest,',
    'the user\'s greenhouse, the sensors, the camera, the hardware/prototype itself,',
    'and follow-up answers to a previous gardening question.',
    '',
    'GENERAL covers everything else: small talk, world knowledge, code, math, jokes,',
    'celebrity questions, definitions of unrelated terms.',
    '',
    'When in doubt, prefer GARDENING only if the message clearly relates to the greenhouse.',
  ].join('\n');

  const userPrompt = [
    transcript ? `Recent conversation:\n${transcript}\n` : '',
    `Latest user message:\n${message.trim()}`,
    '',
    'Classify the latest user message. Output exactly GARDENING or GENERAL.',
  ].filter(Boolean).join('\n');

  const raw = await llm.complete({ system: systemPrompt, user: userPrompt, temperature: 0 });
  return /^gardening/i.test(raw.trim()) ? 'gardening' : 'general';
};

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

// ── Gardening branch ──────────────────────────────────────────────────────

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
    lines.push(
      `Latest telemetry @ ${telemetry.timestamp}`,
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

const buildSourcesBlock = (chunks: Awaited<ReturnType<typeof retrieveChunks>>): string =>
  chunks
    .map((chunk, idx) => {
      const header = `Source ${idx + 1} — ${chunk.sourcePath}${chunk.stage ? ` (${chunk.stage})` : ''}`;
      return `${header}\n${chunk.chunk}`;
    })
    .join('\n\n');

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

  const buildMeta = (intent: 'gardening' | 'general', imageAttached: boolean) => ({
    cropId: effectiveCropId,
    lang,
    stage,
    intent,
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

  // ── Intent gating ────────────────────────────────────────────────────
  const intent = await classifyIntent(trimmedMessage, history);
  const llm = getChatProvider();

  if (intent === 'general') {
    const systemPrompt = [
      'You are a friendly general-purpose assistant.',
      'Answer the user concisely and accurately.',
      `Respond in ${lang.toUpperCase()}.`,
      'After your answer, add ONE short sentence noting that you are built for greenhouse questions and offering to talk about their plants or sensors.',
    ].join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...turnsToChatMessages(history),
      { role: 'user', content: trimmedMessage },
    ];

    const completion = await llm.complete({ messages, temperature });
    await appendTurn(threadId, { role: 'assistant', content: completion });

    return AssistantAnswerSchema.parse({
      message: completion,
      sources: [],
      threadId,
      meta: buildMeta('general', false),
    });
  }

  // ── Gardening branch ────────────────────────────────────────────────
  const nowMs = Date.now();
  const last24hFrom = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const last14dFrom = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(nowMs).toISOString();

  const [chunks, telemetry, cameraImages, last24h, last14d] = await Promise.all([
    retrieveChunks({
      query: trimmedMessage,
      cropId: effectiveCropId,
      lang,
      stage,
      topK,
    }),
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
      ? `An image captured at ${latestImage.capturedAt} is attached.`
      : `An image captured at ${latestImage.capturedAt} is attached, but it is older than 24 hours.`
    : 'No camera image is available.';
  const latestImageUrl = latestImage ? await getBlobSasUrl(latestImage.blobPath) : undefined;

  const sourcesBlock = chunks.length
    ? buildSourcesBlock(chunks)
    : '(no source documents matched — answer cautiously and offer to gather more info)';
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
    'You are the Tiny Greenhouse assistant. You diagnose this specific greenhouse using SOURCES',
    '(crop-specific docs with target ranges), SNAPSHOT (current reading + last-24h and last-14d',
    'aggregates already computed for you), and usually a recent camera image. You may call',
    'get_telemetry_aggregates(from, to, metrics?) for other windows. The current time is ' +
      new Date().toISOString() + '.',
    '',
    'Diagnostic rules — DO NOT skip these:',
    '1. Identify the target ranges for the user\'s crop and stage from SOURCES (temperature, humidity,',
    '   soil moisture, light, watering frequency). Quote the numbers, citing "Source N".',
    '2. Compare those targets to the actual SNAPSHOT values AND the last-24h / last-14d aggregates.',
    '   State the gap in numbers (e.g. "soil moisture averaged 22% over the last 14d vs the 50–70%',
    '   target — chronically dry"). Always reference the trend, not just the latest reading.',
    '3. Only then conclude what is wrong, naming the most likely cause first based on the data gap.',
    '4. Give 1–3 concrete, plant- and sensor-specific next actions tied to the numbers you cited.',
    '',
    'Hard constraints:',
    '- NEVER produce a generic numbered list of possible causes ("could be underwatering, could be',
    '  overwatering, could be nutrients, could be pests…"). That answer is forbidden when SNAPSHOT',
    '  data is present. Commit to a diagnosis grounded in the actual numbers.',
    '- If SOURCES do not contain a target range you need, say so explicitly instead of inventing one.',
    '- If the camera image is unclear or you need a detail you cannot see, ASK ONE focused',
    '  clarifying question instead of guessing. One question per turn, max.',
    '- Be concise. Lead with the diagnosis, then evidence, then actions.',
    `Respond in ${lang.toUpperCase()}.`,
  ].join('\n');

  const contextBlock = [
    'SOURCES:',
    sourcesBlock,
    '',
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

  const completion = await llm.complete({
    messages,
    images: latestImageUrl ? [latestImageUrl] : undefined,
    tools: [telemetryAggregatesTool],
    toolHandlers: { get_telemetry_aggregates: makeTelemetryAggregatesHandler(uid) },
    temperature,
  });

  await appendTurn(threadId, { role: 'assistant', content: completion });

  return AssistantAnswerSchema.parse({
    message: completion,
    sources: chunks,
    threadId,
    meta: buildMeta('gardening', Boolean(latestImage)),
  });
};
