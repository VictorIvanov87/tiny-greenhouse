import OpenAI from 'openai';

type ProviderKind = 'openai';

type BaseProvider<T extends ProviderKind> = {
  kind: T;
};

export type EmbeddingProvider = BaseProvider<'openai'> & {
  dimensions: number;
  embed: (text: string) => Promise<number[]>;
  ping: () => Promise<void>;
};

export type ChatProvider = BaseProvider<'openai'> & {
  model: string;
  complete: (opts: { system: string; user: string; temperature?: number }) => Promise<string>;
  ping: () => Promise<void>;
};

const OPENAI_EMBED_MODEL = process.env.EMBED_MODEL ?? 'text-embedding-3-small';
const OPENAI_CHAT_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';

let embeddingProvider: EmbeddingProvider | null = null;
let chatProvider: ChatProvider | null = null;

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

const getOpenAIClient = () => {
  const apiKey = requireEnv('OPENAI_API_KEY');
  return new OpenAI({ apiKey });
};

export const getEmbeddingProvider = (): EmbeddingProvider => {
  if (embeddingProvider) {
    return embeddingProvider;
  }

  const provider = (process.env.EMBED_PROVIDER ?? 'openai').toLowerCase();
  if (provider !== 'openai') {
    throw new Error(`Unsupported EMBED_PROVIDER "${provider}"`);
  }

  const client = getOpenAIClient();
  embeddingProvider = {
    kind: 'openai',
    dimensions: 1536,
    embed: async (text: string) => {
      const { data } = await client.embeddings.create({
        input: text,
        model: OPENAI_EMBED_MODEL,
      });
      if (!data.length) {
        throw new Error('Embedding provider returned no data');
      }
      return data[0]!.embedding;
    },
    ping: async () => {
      await client.embeddings.create({
        input: 'ping',
        model: OPENAI_EMBED_MODEL,
      });
    },
  };

  return embeddingProvider;
};

export const getChatProvider = (): ChatProvider => {
  if (chatProvider) {
    return chatProvider;
  }

  const provider = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();
  if (provider !== 'openai') {
    throw new Error(`Unsupported LLM_PROVIDER "${provider}"`);
  }

  const client = getOpenAIClient();
  chatProvider = {
    kind: 'openai',
    model: OPENAI_CHAT_MODEL,
    complete: async ({ system, user, temperature = 0.2 }) => {
      const response = await client.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM provider returned no content');
      }
      return content.trim();
    },
    ping: async () => {
      await client.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
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
