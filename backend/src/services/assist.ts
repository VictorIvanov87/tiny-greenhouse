import { AssistantAnswerSchema, type AssistantAnswer, type GreenhouseConfigType } from '../lib/schemas';
import { getGreenhouseConfig } from './greenhouse';
import { getLatestTelemetry } from './telemetry';
import { retrieveChunks } from './rag';
import { getChatProvider } from '../ai/providers';

const sanitizeCropId = (value?: string | null) => (value && value.trim() ? value.trim() : 'unknown');
const sanitizeOptional = (value?: string | null) => (value && value.trim() ? value.trim() : undefined);

const numberFromEnv = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MIN_QUERY_LENGTH = Math.max(1, numberFromEnv(process.env.ASSIST_MIN_QUERY_LEN, 8));
const SCORE_FLOOR = numberFromEnv(process.env.RAG_SCORE_FLOOR, 0.2);
const DEFAULT_TOP_K = 6;
const DEFAULT_TEMPERATURE = 0.2;
const SHOULD_INCLUDE_OPTIONS_IN_META = process.env.RAG_DEBUG === 'true';
const GENERIC_REPLY =
  'Ask me about light-hour targets, watering cadence, temperature bands, or growth-stage routines and I will cite the right greenhouse docs.';

type AssistOptions = {
  cropId?: string;
  variety?: string;
  topK?: number;
  temperature?: number;
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

  const buildMeta = () =>
    SHOULD_INCLUDE_OPTIONS_IN_META
      ? {
          cropId: effectiveCropId,
          lang,
          stage,
          options: {
            cropId: effectiveCropId,
            variety: effectiveVariety,
            topK,
            temperature,
          },
        }
      : { cropId: effectiveCropId, lang, stage };

  const buildGenericReply = () =>
    AssistantAnswerSchema.parse({
      message: GENERIC_REPLY,
      sources: [],
      meta: buildMeta(),
    });

  if (trimmedMessage.length < MIN_QUERY_LENGTH) {
    return buildGenericReply();
  }

  const chunks = await retrieveChunks({
    query: trimmedMessage,
    cropId: effectiveCropId,
    lang,
    stage,
    topK,
  });

  if (!chunks.length) {
    return AssistantAnswerSchema.parse({
      message:
        'I do not have enough seed data for this crop yet. Please add notes under data/rag and re-run the seeder.',
      sources: [],
      meta: buildMeta(),
    });
  }

  const topScore = typeof chunks[0]?.score === 'number' ? Number(chunks[0]!.score) : undefined;
  if ((topScore ?? 0) < SCORE_FLOOR) {
    return buildGenericReply();
  }

  const telemetry = await getLatestTelemetry(uid);
  const snapshot: string[] = [
    `Greenhouse: ${greenhouse.name} (${greenhouse.id})`,
    `Crop: ${effectiveCropId}${effectiveVariety ? ` / ${effectiveVariety}` : ''}`,
    `Stage: ${stage ?? 'unspecified'}`,
    `Method: ${greenhouse.method}`,
  ];

  if (telemetry) {
    snapshot.push(
      `Latest telemetry @ ${telemetry.timestamp}`,
      `Temperature: ${telemetry.temperature}°C`,
      `Humidity: ${telemetry.humidity}%`,
      `Soil moisture: ${telemetry.soilMoisture}%`,
    );
  } else {
    snapshot.push('No telemetry samples recorded yet.');
  }

  const sourcesBlock = chunks
    .map((chunk, idx) => {
      const header = `Source ${idx + 1} — ${chunk.sourcePath}${chunk.stage ? ` (${chunk.stage})` : ''}`;
      return `${header}\n${chunk.chunk}`;
    })
    .join('\n\n');

  const snapshotBlock = snapshot.join('\n');

  const systemPrompt = [
    'You are the Tiny Greenhouse assistant.',
    'Guardrails:',
    '- Use only the provided SOURCES and SNAPSHOT.',
    '- If the answer is not supported by SOURCES, reply that there is not enough data and suggest a next step.',
    '- Prefer concise, actionable responses; include short rationales for warnings or changes.',
    `Respond in ${lang.toUpperCase()}.`,
  ].join('\n');

  const userPrompt = [
    `User question:\n${trimmedMessage}`,
    'SOURCES:',
    sourcesBlock,
    'SNAPSHOT:',
    snapshotBlock,
    'If SOURCES cannot answer the question, say so explicitly.',
  ].join('\n\n');

  const llm = getChatProvider();
  const completion = await llm.complete({ system: systemPrompt, user: userPrompt, temperature });

  return AssistantAnswerSchema.parse({
    message: completion,
    sources: chunks,
    meta: buildMeta(),
  });
};
