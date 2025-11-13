import { api } from '../../shared/hooks/useApi';

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

const buildBody = (payload: AssistRequestPayload): AssistBody => {
  const body: AssistBody = {
    message: payload.message,
  };

  if (payload.cropId) {
    body.cropId = payload.cropId;
  }

  if (payload.variety) {
    body.variety = payload.variety;
  }

  if (typeof payload.topK === 'number') {
    body.topK = payload.topK;
  }

  if (typeof payload.temperature === 'number') {
    body.temperature = payload.temperature;
  }

  return body;
};

export const sendAssistMessage = async (payload: AssistRequestPayload): Promise<AssistantAnswer> => {
  const body = buildBody(payload);
  const { data } = await api.post<AssistantEnvelope>('/assist', body);
  return ensureOk(data);
};
