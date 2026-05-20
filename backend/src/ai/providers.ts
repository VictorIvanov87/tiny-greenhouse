import OpenAI, { AzureOpenAI } from 'openai';
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

type ProviderKind = 'openai' | 'ollama' | 'azure-openai';

export type EmbeddingProvider = {
  kind: ProviderKind;
  dimensions: number;
  embed: (text: string) => Promise<number[]>;
  ping: () => Promise<void>;
};

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string; images?: string[] }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export type CompleteOptions = {
  // Legacy single-turn form. Either `messages` or both `system` + `user` must be provided.
  system?: string;
  user?: string;
  // Multi-turn form.
  messages?: ChatMessage[];
  // Attached to the last user message as image_url parts.
  images?: string[];
  tools?: ToolDef[];
  toolHandlers?: Record<string, ToolHandler>;
  temperature?: number;
  toolLoopMax?: number;
};

export type ChatProvider = {
  kind: ProviderKind;
  model: string;
  complete: (opts: CompleteOptions) => Promise<string>;
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
    apiKey: 'ollama',
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

const buildUserContent = (
  text: string,
  images?: string[],
): string | ChatCompletionContentPart[] => {
  if (!images?.length) return text;
  const parts: ChatCompletionContentPart[] = [{ type: 'text', text }];
  for (const url of images) {
    parts.push({ type: 'image_url', image_url: { url } });
  }
  return parts;
};

const toOpenAIMessages = (
  messages: ChatMessage[],
  trailingImages?: string[],
): ChatCompletionMessageParam[] => {
  const out: ChatCompletionMessageParam[] = [];
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === 'user') return i;
    }
    return -1;
  })();

  messages.forEach((msg, idx) => {
    if (msg.role === 'system') {
      out.push({ role: 'system', content: msg.content });
      return;
    }
    if (msg.role === 'assistant') {
      out.push({ role: 'assistant', content: msg.content });
      return;
    }
    if (msg.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      });
      return;
    }
    // user
    const images = idx === lastUserIdx ? (msg.images ?? trailingImages ?? []) : (msg.images ?? []);
    out.push({ role: 'user', content: buildUserContent(msg.content, images) });
  });

  return out;
};

const toOpenAITools = (tools?: ToolDef[]): ChatCompletionTool[] | undefined => {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
};

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
  const toolLoopMaxDefault = Math.max(1, Number(process.env.LLM_TOOL_LOOP_MAX ?? 4));

  chatProvider = {
    kind,
    model,
    complete: async (opts) => {
      const temperature = opts.temperature ?? 0.2;
      const toolLoopMax = opts.toolLoopMax ?? toolLoopMaxDefault;

      const initialMessages: ChatMessage[] =
        opts.messages ?? [
          ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
          ...(opts.user ? [{ role: 'user' as const, content: opts.user }] : []),
        ];

      if (!initialMessages.length) {
        throw new Error('chatProvider.complete: provide either messages or system+user');
      }

      const openAITools = toOpenAITools(opts.tools);
      const supportsToolsAndVision = kind !== 'ollama';

      // For non-OpenAI-compatible providers without tool support, fall back to a
      // simple single-shot completion without tools/images.
      if (!supportsToolsAndVision) {
        const messages = toOpenAIMessages(initialMessages);
        const response = await client.chat.completions.create({
          model,
          temperature,
          messages,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('LLM provider returned no content');
        return content.trim();
      }

      const messages = toOpenAIMessages(initialMessages, opts.images);
      let lastAssistantText = '';

      for (let iteration = 0; iteration < toolLoopMax; iteration++) {
        const response = await client.chat.completions.create({
          model,
          temperature,
          messages,
          ...(openAITools ? { tools: openAITools } : {}),
        });

        const choice = response.choices[0];
        if (!choice) throw new Error('LLM provider returned no choices');

        const msg = choice.message;
        if (typeof msg.content === 'string' && msg.content.trim()) {
          lastAssistantText = msg.content.trim();
        }

        const functionCalls = (msg.tool_calls ?? []).filter(
          (tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function',
        );
        if (!functionCalls.length || choice.finish_reason === 'stop') {
          if (!lastAssistantText) {
            throw new Error('LLM provider returned no content');
          }
          return lastAssistantText;
        }

        // Record the assistant message with tool_calls so the tool-role
        // messages we append below resolve correctly.
        messages.push({
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: functionCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });

        for (const call of functionCalls) {
          const handler = opts.toolHandlers?.[call.function.name];
          let payload: unknown;
          if (!handler) {
            payload = { error: `Unknown tool: ${call.function.name}` };
          } else {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = call.function.arguments
                ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
                : {};
            } catch (err) {
              payload = { error: `Invalid JSON arguments: ${(err as Error).message}` };
            }
            if (payload === undefined) {
              try {
                payload = await handler(parsedArgs);
              } catch (err) {
                payload = { error: `Tool ${call.function.name} threw: ${(err as Error).message}` };
              }
            }
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: typeof payload === 'string' ? payload : JSON.stringify(payload),
          });
        }
      }

      // Loop budget exhausted — return the last assistant text we have, or fail loudly.
      if (lastAssistantText) return lastAssistantText;
      throw new Error('LLM tool-call loop exceeded budget without producing content');
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
