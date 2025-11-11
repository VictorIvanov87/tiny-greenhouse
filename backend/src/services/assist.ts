import { AssistantAnswerSchema, type AssistantAnswer, type GreenhouseConfigType } from '../lib/schemas';
import { getGreenhouseConfig } from './greenhouse';
import { getLatestTelemetry } from './telemetry';
import { retrieveChunks } from './rag';
import { getChatProvider } from '../ai/providers';

const sanitizeCropId = (value?: string | null) => (value && value.trim() ? value.trim() : 'unknown');

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

export const buildAssistantAnswer = async (uid: string, message: string): Promise<AssistantAnswer> => {
  const { greenhouse, cropId, lang, stage } = await resolveAssistContext(uid);

  const chunks = await retrieveChunks({
    query: message,
    cropId,
    lang,
    stage,
  });

  if (!chunks.length) {
    return AssistantAnswerSchema.parse({
      message:
        'I do not have enough seed data for this crop yet. Please add notes under data/rag and re-run the seeder.',
      sources: [],
      meta: { cropId, lang, stage },
    });
  }

  const telemetry = await getLatestTelemetry(uid);
  const snapshot: string[] = [
    `Greenhouse: ${greenhouse.name} (${greenhouse.id})`,
    `Crop: ${cropId}${greenhouse.variety ? ` / ${greenhouse.variety}` : ''}`,
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
    `User question:\n${message.trim()}`,
    'SOURCES:',
    sourcesBlock,
    'SNAPSHOT:',
    snapshotBlock,
    'If SOURCES cannot answer the question, say so explicitly.',
  ].join('\n\n');

  const llm = getChatProvider();
  const completion = await llm.complete({ system: systemPrompt, user: userPrompt });

  return AssistantAnswerSchema.parse({
    message: completion,
    sources: chunks,
    meta: { cropId, lang, stage },
  });
};
