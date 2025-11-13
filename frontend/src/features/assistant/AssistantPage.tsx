import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Spinner,
  Textarea,
  Toast,
  ToastToggle,
} from 'flowbite-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';
import type { SetupProfile } from '../setup/state';
import { getCurrentGreenhouse } from '../greenhouse/api';
import type { GreenhouseConfig } from '../greenhouse/types';
import { sendAssistMessage, type AssistantSource } from './api';
import type { AssistantChatMessage, ChatMessage, UserChatMessage } from './types';
import { MAX_MESSAGES, isAssistantMessage } from './types';
import { buildStorageKey, loadTranscript, saveTranscript } from './storage';
import { ApiError } from '../../shared/hooks/useApi';

type AssistantContext = {
  profile: SetupProfile;
};

const DEFAULT_TOP_K = 6;
const DEFAULT_TEMPERATURE = 0.2;

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const trimMessages = (list: ChatMessage[]) =>
  list.length > MAX_MESSAGES ? list.slice(-MAX_MESSAGES) : list;

const basename = (path: string) => {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.at(-1) ?? path;
};

const AssistantPage = () => {
  const { profile } = useOutletContext<AssistantContext>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [greenhouse, setGreenhouse] = useState<GreenhouseConfig | null>(null);
  const [greenhouseLoading, setGreenhouseLoading] = useState(true);
  const [greenhouseError, setGreenhouseError] = useState<string | null>(null);
  const [expandedRetrieval, setExpandedRetrieval] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const storageKey = useMemo(
    () =>
      buildStorageKey(
        user?.uid,
        greenhouse?.cropId ?? greenhouse?.plantType ?? profile.currentGreenhouseId,
        greenhouse?.variety
      ),
    [user?.uid, greenhouse?.cropId, greenhouse?.plantType, greenhouse?.variety, profile.currentGreenhouseId]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchGreenhouse = async () => {
      setGreenhouseLoading(true);
      setGreenhouseError(null);

      try {
        const config = await getCurrentGreenhouse();
        if (!cancelled) {
          setGreenhouse(config);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Failed to load greenhouse configuration';
          setGreenhouseError(message);
        }
      } finally {
        if (!cancelled) {
          setGreenhouseLoading(false);
        }
      }
    };

    fetchGreenhouse();
    return () => {
      cancelled = true;
    };
  }, [profile.currentGreenhouseId]);

  useEffect(() => {
    const transcript = loadTranscript(storageKey);
    setMessages(trimMessages(transcript));
  }, [storageKey]);

  useEffect(() => {
    const persistable = messages.filter(
      (message) => message.role === 'user' || (isAssistantMessage(message) && message.status !== 'pending')
    );

    saveTranscript(storageKey, trimMessages(persistable));
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (!rateLimited || typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => setRateLimited(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [rateLimited]);

  const toggleRetrieval = useCallback((messageId: string) => {
    setExpandedRetrieval((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const handleSendPrompt = useCallback(
    async (promptText: string, existingAssistantId?: string) => {
      const trimmed = promptText.trim();
      if (!trimmed) {
        return;
      }

      let assistantId = existingAssistantId;

      if (!assistantId) {
        const userMessage: UserChatMessage = {
          id: createId(),
          role: 'user',
          content: trimmed,
          createdAt: new Date().toISOString(),
        };

        const assistantMessage: AssistantChatMessage = {
          id: createId(),
          role: 'assistant',
          content: '',
          sources: [],
          meta: undefined,
          retrieval: undefined,
          status: 'pending',
          errorMessage: undefined,
          promptId: userMessage.id,
          createdAt: new Date().toISOString(),
        };

        assistantId = assistantMessage.id;
        setMessages((prev) => trimMessages([...prev, userMessage, assistantMessage]));
      } else {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== assistantId || !isAssistantMessage(message)) {
              return message;
            }

            return {
              ...message,
              status: 'pending',
              errorMessage: undefined,
              sources: [],
              retrieval: undefined,
              createdAt: new Date().toISOString(),
            };
          })
        );
      }

      setIsSending(true);
      try {
        const answer = await sendAssistMessage({
          message: trimmed,
          cropId: greenhouse?.cropId ?? greenhouse?.plantType ?? undefined,
          variety: greenhouse?.variety ?? undefined,
          topK: DEFAULT_TOP_K,
          temperature: DEFAULT_TEMPERATURE,
        });

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== assistantId || !isAssistantMessage(message)) {
              return message;
            }

            return {
              ...message,
              status: 'ready',
              content: answer.message,
              sources: answer.sources,
              meta: answer.meta,
              retrieval: answer.retrieval,
            };
          })
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          setRateLimited(true);
        }

        const message = error instanceof Error ? error.message : 'Assistant request failed';
        setMessages((prev) =>
          prev.map((entry) => {
            if (entry.id !== assistantId || !isAssistantMessage(entry)) {
              return entry;
            }

            return {
              ...entry,
              status: 'error',
              errorMessage: message,
            };
          })
        );
      } finally {
        setIsSending(false);
      }

    },
    [greenhouse?.cropId, greenhouse?.plantType, greenhouse?.variety]
  );

  const handleSend = async () => {
    if (isSending) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setInput('');
    await handleSendPrompt(trimmed);
  };

  const handleRetry = useCallback(
    (assistantId: string) => {
      if (isSending) {
        return;
      }

      const message = messages.find((entry) => entry.id === assistantId);
      if (!message || !isAssistantMessage(message) || !message.promptId) {
        return;
      }

      const prompt = messages.find(
        (entry): entry is UserChatMessage => entry.id === message.promptId && entry.role === 'user'
      );

      if (!prompt) {
        return;
      }

      handleSendPrompt(prompt.content, message.id);
    },
    [handleSendPrompt, isSending, messages]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderCitations = (sources: AssistantSource[]) => {
    if (!sources.length) {
      return null;
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {sources.map((source) => (
          <span
            key={source.id}
            className="rounded-full border border-[#22324a] bg-[#0f1729] px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200"
          >
            {basename(source.sourcePath)}
            {source.stage ? ` (${source.stage})` : ''}
          </span>
        ))}
      </div>
    );
  };

  const canSend = Boolean(input.trim()) && !isSending;

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Assistant</h1>
        <p className="text-sm text-slate-400">
          Chat with your greenhouse co-pilot for quick tips, routines, and sensor explanations.
        </p>
      </div>

      {greenhouseError ? (
        <Alert color="failure">
          <span className="font-semibold">Failed to load greenhouse</span>
          <div className="text-sm text-slate-100">{greenhouseError}</div>
        </Alert>
      ) : null}

      <Card className="flex h-[38rem] flex-col rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#1f2a3d] pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Greenhouse Assistant</h2>
            <p className="text-xs text-slate-400">
              Answers grounded in your crop plan, docs, and latest telemetry.
            </p>
          </div>
          <Badge className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            Live
          </Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1f2a3d] bg-[#0f1729] p-6 text-sm text-slate-400">
              {greenhouseLoading
                ? 'Loading your greenhouse context...'
                : 'Ask about routines, schedules, or telemetry trends. I will cite the seed files powering each answer.'}
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} text-sm leading-relaxed`}
                >
                  <div
                    className={`max-w-full rounded-2xl border px-4 py-3 sm:max-w-[80%] ${
                      isUser
                        ? 'border-[#1f2a3d] bg-[#0f1729] text-slate-50 shadow-[0_16px_36px_rgba(8,20,38,0.35)]'
                        : 'border-[#22324a] bg-[#1a2740] text-slate-100'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {isUser ? 'You' : 'Assistant'}
                    </p>
                    <div className="mt-2 whitespace-pre-line text-slate-100">
                      {message.role === 'assistant' && message.status === 'pending'
                        ? 'Thinking...'
                        : message.role === 'assistant' && message.status === 'error'
                        ? message.errorMessage ?? 'Assistant failed to reply.'
                        : message.content}
                    </div>

                    {message.role === 'assistant' && message.status === 'pending' ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                        <Spinner size="sm" />
                        <span>Generating answer…</span>
                      </div>
                    ) : null}

                    {message.role === 'assistant' && message.status === 'ready'
                      ? renderCitations(message.sources)
                      : null}

                    {message.role === 'assistant' &&
                    message.status === 'ready' &&
                    !message.sources.length ? (
                      <p className="mt-3 text-xs text-slate-300">I don’t have docs for this crop yet.</p>
                    ) : null}

                    {message.role === 'assistant' && message.status === 'error' ? (
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
                        <Button
                          size="xs"
                          color="light"
                          onClick={() => handleRetry(message.id)}
                          disabled={isSending}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : null}

                    {message.role === 'assistant' &&
                    message.retrieval &&
                    message.retrieval.length > 0 ? (
                      <div className="mt-4 space-y-2 border-t border-[#22324a] pt-4">
                        <button
                          type="button"
                          onClick={() => toggleRetrieval(message.id)}
                          className="text-xs font-medium text-emerald-200 underline underline-offset-4"
                        >
                          {expandedRetrieval.has(message.id) ? 'Hide retrieval' : 'Show retrieval'}
                        </button>
                        {expandedRetrieval.has(message.id) ? (
                          <div className="space-y-3 rounded-2xl border border-[#22324a] bg-[#0f1729] p-3 text-xs text-slate-200">
                            {message.retrieval.map((chunk) => (
                              <div key={chunk.id}>
                                <p className="font-semibold text-emerald-200">
                                  {basename(chunk.sourcePath)}
                                  {chunk.stage ? ` (${chunk.stage})` : ''}
                                </p>
                                <p className="mt-1 whitespace-pre-line text-slate-300">{chunk.chunk}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto space-y-3 border-t border-[#1f2a3d] pt-4">
          <Textarea
            rows={3}
            placeholder={
              greenhouseLoading
                ? 'Loading greenhouse context...'
                : 'Describe what you need and I’ll cite the docs that apply'
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || greenhouseLoading}
            className="border-[#22324a] bg-[#0f1729] text-slate-100 placeholder:text-slate-500"
          />
          <Button
            disabled={!canSend}
            onClick={handleSend}
            className="w-full border-none bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-[0_14px_36px_rgba(14,70,155,0.4)] transition hover:from-emerald-400 hover:to-sky-400 md:w-auto"
          >
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </Card>

      {rateLimited ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 px-2">
          <Toast className="border border-amber-200 bg-white text-slate-900 shadow-lg">
            <div className="text-sm font-semibold">Rate limit — try later</div>
            <div className="text-xs text-slate-500">You hit the assistant rate limit. Give it a minute.</div>
            <ToastToggle onDismiss={() => setRateLimited(false)} />
          </Toast>
        </div>
      ) : null}
    </div>
  );
};

export default AssistantPage;
