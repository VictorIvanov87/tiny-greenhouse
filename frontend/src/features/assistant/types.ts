import type { AssistantMeta, AssistantSource } from './api';

export type ChatMessageRole = 'user' | 'assistant';

type BaseMessage = {
  id: string;
  role: ChatMessageRole;
  createdAt: string;
};

export type UserChatMessage = BaseMessage & {
  role: 'user';
  content: string;
};

export type AssistantChatMessage = BaseMessage & {
  role: 'assistant';
  content: string;
  sources: AssistantSource[];
  meta?: AssistantMeta;
  retrieval?: AssistantSource[];
  status: 'pending' | 'ready' | 'error';
  errorMessage?: string;
  promptId: string | null;
};

export type ChatMessage = UserChatMessage | AssistantChatMessage;

export const MAX_MESSAGES = 20;

export const isAssistantMessage = (message: ChatMessage): message is AssistantChatMessage =>
  message.role === 'assistant';
