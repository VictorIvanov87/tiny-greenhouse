import { api, ApiError } from '../../shared/hooks/useApi';

export type AssistantSource = {
  id: string;
  cropId: string;
  stage?: string | null;
  lang: string;
  sourcePath: string;
  chunk: string;
  score?: number;
};

export type AssistantMeta = {
  cropId: string;
  lang: string;
  stage?: string | null;
};

export type AssistantAnswer = {
  message: string;
  sources: AssistantSource[];
  meta?: AssistantMeta;
  retrieval?: AssistantSource[];
};

type AssistantResponseEnvelope = {
  ok: true;
  data: AssistantAnswer;
};

type AssistantErrorEnvelope = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

type AssistantEnvelope = AssistantResponseEnvelope | AssistantErrorEnvelope;

const ensureOk = (payload: AssistantEnvelope): AssistantAnswer => {
  if (payload && 'ok' in payload && payload.ok) {
    return payload.data;
  }

  const message = (payload as AssistantErrorEnvelope)?.error?.message ?? 'Assistant request failed';
  throw new Error(message);
};

let extendedPayloadRejected = false;

export type AssistRequestPayload = {
  message: string;
  cropId?: string;
  variety?: string;
  topK?: number;
  temperature?: number;
};

type AssistBody = {
  message: string;
  cropId?: string;
  variety?: string;
  topK?: number;
  temperature?: number;
};

const buildBody = (
  payload: AssistRequestPayload
): { body: AssistBody; hasExtras: boolean } => {
  const body: AssistBody = {
    message: payload.message,
  };
  let hasExtras = false;

  if (!extendedPayloadRejected) {
    if (payload.cropId) {
      body.cropId = payload.cropId;
      hasExtras = true;
    }

    if (payload.variety) {
      body.variety = payload.variety;
      hasExtras = true;
    }

    if (typeof payload.topK === 'number') {
      body.topK = payload.topK;
      hasExtras = true;
    }

    if (typeof payload.temperature === 'number') {
      body.temperature = payload.temperature;
      hasExtras = true;
    }
  }

  return { body, hasExtras };
};

export const sendAssistMessage = async (payload: AssistRequestPayload): Promise<AssistantAnswer> => {
  const { body, hasExtras } = buildBody(payload);

  try {
    const { data } = await api.post<AssistantEnvelope>('/assist', body);
    return ensureOk(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && hasExtras) {
      extendedPayloadRejected = true;
      const { data } = await api.post<AssistantEnvelope>('/assist', { message: payload.message });
      return ensureOk(data);
    }

    throw error;
  }
};
