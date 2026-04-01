import OpenAI, { AzureOpenAI } from 'openai';

type ProviderKind = 'openai' | 'ollama' | 'azure-openai';

export type EmbeddingProvider = {
  kind: ProviderKind;
  dimensions: number;
  embed: (text: string) => Promise<number[]>;
  ping: () => Promise<void>;
};

export type ChatProvider = {
  kind: ProviderKind;
  model: string;
  complete: (opts: { system: string; user: string; temperature?: number }) => Promise<string>;
  ping: () => Promise<void>;
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var ${key}`);
  return value;
};

// ── Client factories ──────────────────────────────────────────────────────

const makeOpenAIClient = () =>
  new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });

const makeOllamaClient = () =>
  new OpenAI({
    baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
    apiKey: 'ollama', // Ollama ignores this but the SDK requires a non-empty value
  });

const makeAzureClient = () =>
  new AzureOpenAI({
    endpoint: requireEnv('AZURE_OPENAI_ENDPOINT'),
    apiKey: requireEnv('AZURE_OPENAI_API_KEY'),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-01',
  });

const makeClient = (kind: ProviderKind): OpenAI => {
  if (kind === 'ollama') return makeOllamaClient();
  if (kind === 'azure-openai') return makeAzureClient();
  return makeOpenAIClient();
};

// ── Singletons ────────────────────────────────────────────────────────────

let embeddingProvider: EmbeddingProvider | null = null;
let chatProvider: ChatProvider | null = null;

// ── Embedding provider ────────────────────────────────────────────────────

export const getEmbeddingProvider = (): EmbeddingProvider => {
  if (embeddingProvider) return embeddingProvider;

  const kind = (process.env.EMBED_PROVIDER ?? 'openai').toLowerCase() as ProviderKind;
  const dimensions = Number(process.env.EMBED_DIMENSIONS ?? 1536);

  const defaultModel: Record<ProviderKind, string> = {
    openai: 'text-embedding-3-small',
    ollama: 'nomic-embed-text',
    'azure-openai': 'text-embedding-ada-002',
  };
  const model =
    process.env.EMBED_MODEL ??
    (kind === 'azure-openai'
      ? (process.env.AZURE_OPENAI_EMBED_DEPLOYMENT ?? defaultModel[kind])
      : defaultModel[kind]);

  if (!['openai', 'ollama', 'azure-openai'].includes(kind)) {
    throw new Error(`Unsupported EMBED_PROVIDER "${kind}"`);
  }

  const client = makeClient(kind);

  embeddingProvider = {
    kind,
    dimensions,
    embed: async (text) => {
      const { data } = await client.embeddings.create({ input: text, model });
      if (!data.length) throw new Error('Embedding provider returned no data');
      return data[0]!.embedding;
    },
    ping: async () => {
      await client.embeddings.create({ input: 'ping', model });
    },
  };

  return embeddingProvider;
};

// ── Chat provider ─────────────────────────────────────────────────────────

export const getChatProvider = (): ChatProvider => {
  if (chatProvider) return chatProvider;

  const kind = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase() as ProviderKind;

  const defaultModel: Record<ProviderKind, string> = {
    openai: 'gpt-4o-mini',
    ollama: 'llama3.2',
    'azure-openai': 'gpt-4o',
  };
  const model =
    process.env.LLM_MODEL ??
    (kind === 'azure-openai'
      ? (process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? defaultModel[kind])
      : defaultModel[kind]);

  if (!['openai', 'ollama', 'azure-openai'].includes(kind)) {
    throw new Error(`Unsupported LLM_PROVIDER "${kind}"`);
  }

  const client = makeClient(kind);

  chatProvider = {
    kind,
    model,
    complete: async ({ system, user, temperature = 0.2 }) => {
      const response = await client.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('LLM provider returned no content');
      return content.trim();
    },
    ping: async () => {
      await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a diagnostics probe.' },
          { role: 'user', content: 'Reply with OK.' },
        ],
      });
    },
  };

  return chatProvider;
};
