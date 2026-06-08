import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Alert, Badge, Card, Spinner, Textarea, Toast, ToastToggle } from 'flowbite-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';
import type { SetupProfile } from '../setup/state';
import { getCurrentGreenhouse } from '../greenhouse/api';
import type { GreenhouseConfig } from '../greenhouse/types';
import { sendAssistMessage, type AssistantSource } from './api';
import type { AssistantChatMessage, ChatMessage, UserChatMessage } from './types';
import { MAX_MESSAGES, isAssistantMessage } from './types';
import {
  buildStorageKey,
  loadThreadId,
  loadTranscript,
  saveThreadId,
  saveTranscript,
} from './storage';
import { ApiError } from '../../shared/hooks/useApi';
import { MarkdownMessage } from '../../shared/ui/MarkdownMessage';

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

const titleCase = (value: string) =>
  value
    .replace(/\.[^.]+$/, '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const formatMessageTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
};

const AssistantPage = () => {
  const { profile } = useOutletContext<AssistantContext>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
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
    [
      user?.uid,
      greenhouse?.cropId,
      greenhouse?.plantType,
      greenhouse?.variety,
      profile.currentGreenhouseId,
    ]
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
    setThreadId(loadThreadId(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const persistable = messages.filter(
      (message) =>
        message.role === 'user' || (isAssistantMessage(message) && message.status !== 'pending')
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
          threadId: threadId ?? undefined,
        });

        if (answer.threadId && answer.threadId !== threadId) {
          setThreadId(answer.threadId);
          saveThreadId(storageKey, answer.threadId);
        }

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
    [greenhouse?.cropId, greenhouse?.plantType, greenhouse?.variety, threadId, storageKey]
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

    const seen = new Set<string>();
    const uniqueSources = sources.filter((source) => {
      const key = `${source.sourcePath}:${source.stage ?? ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {uniqueSources.map((source) => {
          const citationLabel = titleCase(basename(source.sourcePath));
          const stageLabel = source.stage ? titleCase(source.stage) : null;
          return (
            <span
              key={`${source.sourcePath}:${source.stage ?? ''}`}
              className="flex items-center gap-2 rounded-full border border-[#22324a] bg-[#0f1729] px-3 py-1 text-xs font-medium text-slate-200"
            >
              <span className="tracking-wide">{citationLabel}</span>
              {stageLabel ? (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                  {stageLabel}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    );
  };

  const canSend = Boolean(input.trim()) && !isSending;

  return (
    <div className="flex flex-col h-full text-slate-200">
      <div className="shrink-0 mb-4">
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Assistant</h1>
        <p className="text-sm text-slate-400">
          Chat with your greenhouse co-pilot for quick tips, routines, and sensor explanations.
        </p>
      </div>

      {greenhouseError ? (
        <div className="shrink-0 mb-4">
          <Alert color="failure">
            <span className="font-semibold">Failed to load greenhouse</span>
            <div className="text-sm text-slate-100">{greenhouseError}</div>
          </Alert>
        </div>
      ) : null}

      <Card className="flex flex-col flex-1 min-h-0 rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#1f2a3d] pb-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Greenhouse Assistant</h2>
            <p className="text-xs text-slate-400">
              Answers grounded in your crop plan, docs, and latest telemetry.
            </p>
          </div>
          <Badge className="rounded-full border text-sm border-green-500 text-green-500">
            Live
          </Badge>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto py-4 px-1">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">
                {greenhouseLoading ? 'Loading greenhouse context...' : 'Ask me anything about your greenhouse.'}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 text-sm leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-emerald-300">AI</span>
                    </div>
                  )}

                  <div
                    className={`max-w-full [overflow-wrap:anywhere] sm:max-w-[78%] ${
                      isUser
                        ? 'rounded-2xl rounded-br-sm border border-[#2a4a72] bg-[#1d3a5c] px-4 py-3 text-slate-50'
                        : 'rounded-2xl rounded-bl-sm border border-[#22324a] bg-[#162236] px-4 py-3 text-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      {message.role === 'assistant' && message.status === 'pending' ? (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Spinner size="sm" />
                          <span>Thinking...</span>
                        </div>
                      ) : message.role === 'assistant' && message.status === 'error' ? (
                        <span className="whitespace-pre-line [overflow-wrap:anywhere]">
                          {message.errorMessage ?? 'Assistant failed to reply.'}
                        </span>
                      ) : message.role === 'assistant' ? (
                        <MarkdownMessage text={message.content} className="min-w-0 [overflow-wrap:anywhere]" />
                      ) : (
                        <span className="whitespace-pre-line [overflow-wrap:anywhere]">{message.content}</span>
                      )}
                    </div>

                    {message.role === 'assistant' && message.status === 'ready'
                      ? renderCitations(message.sources)
                      : null}

                    {message.role === 'assistant' && message.status === 'error' ? (
                      <div className="mt-2">
                        <button
                          className="text-xs text-emerald-300 underline underline-offset-2 hover:text-emerald-200 disabled:opacity-50"
                          onClick={() => handleRetry(message.id)}
                          disabled={isSending}
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}

                    {message.role === 'assistant' &&
                    message.retrieval &&
                    message.retrieval.length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-[#22324a] pt-3">
                        <button
                          className="text-xs font-medium text-emerald-200 underline underline-offset-4 hover:text-emerald-100"
                          onClick={() => toggleRetrieval(message.id)}
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
                                <p className="mt-1 whitespace-pre-line text-slate-300">
                                  {chunk.chunk}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <span className={`text-xs text-slate-500 mt-2 block ${isUser ? 'text-right' : ''}`}>
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 border-t border-[#1f2a3d] pt-4">
          <div className="flex items-end gap-2">
            <Textarea
              rows={3}
              className="flex-1 resize-none"
              placeholder={
                greenhouseLoading
                  ? 'Loading greenhouse context...'
                  : 'Ask about your greenhouse...'
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || greenhouseLoading}
            />
            <button
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canSend}
              onClick={handleSend}
              aria-label="Send"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </Card>

      {rateLimited ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 px-2">
          <Toast className="border border-amber-200 bg-white text-slate-900 shadow-lg">
            <div className="text-sm font-semibold">Rate limit — try later</div>
            <div className="text-xs text-slate-500">
              You hit the assistant rate limit. Give it a minute.
            </div>
            <ToastToggle onDismiss={() => setRateLimited(false)} />
          </Toast>
        </div>
      ) : null}
    </div>
  );
};

export default AssistantPage;
