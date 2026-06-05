import { useRef, useState, useEffect } from 'react';
import { Badge, Spinner } from 'flowbite-react';
import { sendAssistMessage } from '../../assistant/api';
import type { AssistantAnswer } from '../../assistant/api';
import { MarkdownMessage } from '../../../shared/ui/MarkdownMessage';

type StepContext = 'crop-selection' | 'alarms-setup' | 'physical-setup';

type WizardAssistProps = {
  cropId?: string;
  variety?: string;
  stepContext: StepContext;
  disabled?: boolean;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantAnswer['sources'];
};

const SUGGESTED_QUESTIONS: Record<StepContext, string[]> = {
  'crop-selection': [
    'What light schedule works best for this variety?',
    'How often should I water?',
    'What temperature range is ideal?',
  ],
  'alarms-setup': [
    'What temperature is dangerous for my plant?',
    'Should I set humidity alerts?',
    'What soil moisture level is too low?',
  ],
  'physical-setup': [
    'How deep should I plant the seeds?',
    'What soil mix works best?',
    'How far from the light source?',
  ],
};

const MAX_MESSAGES = 10;

const WizardAssist = ({ cropId, variety, stepContext, disabled }: WizardAssistProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || disabled || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    };

    setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 2)), userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextPrefix = `[Context: user is on the ${stepContext} step, setting up ${variety ?? 'a'} ${cropId ?? 'crop'}] `;
      const response = await sendAssistMessage({
        message: contextPrefix + question,
        cropId,
        variety,
        topK: 6,
        temperature: 0.2,
      });

      const assistMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        sources: response.sources,
      };

      setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), assistMsg]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Request failed';
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't answer that. ${reason}`,
      };
      setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = SUGGESTED_QUESTIONS[stepContext];

  return (
    <div className="sticky top-6 flex flex-col rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-4 h-full">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">🤖 Ask Assistant</h3>
          <p className="text-xs text-slate-400">Context-aware help for this step</p>
        </div>
        {loading ? <Spinner size="sm" color="success" /> : null}
      </div>

      {disabled ? (
        <div className="rounded-xl bg-[#0f1729] px-3 py-2 text-sm text-slate-400">
          Pick a crop & variety first to enable the assistant.
        </div>
      ) : (
        <>
          {messages.length === 0 ? (
            <div className="mb-3 space-y-2">
              <p className="text-xs font-medium text-slate-400">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="rounded-full border border-[#22324a] bg-[#0f1729] px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.length > 0 ? (
            <div
              ref={scrollRef}
              className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-[#0f1729] p-3"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm ${
                    msg.role === 'user' ? 'text-right text-slate-300' : 'text-left text-slate-100'
                  }`}
                >
                  <div
                    className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-left ${
                      msg.role === 'user'
                        ? 'bg-emerald-900/30 text-emerald-100'
                        : 'bg-[#1a2740] text-slate-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage text={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.sources && msg.sources.length > 0 ? (
                    <div className="mt-1 flex flex-wrap justify-start gap-1">
                      {msg.sources.slice(0, 2).map((source) => (
                        <Badge key={source.id} color="gray" className="text-[10px]">
                          {source.sourcePath}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {loading ? <div className="text-left text-xs text-slate-500">Thinking…</div> : null}
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              placeholder="Ask a question…"
              className="flex-1 rounded-xl border border-[#22324a] bg-[#0f1729] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="rounded-xl border border-emerald-600 bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-600/20 disabled:opacity-40"
            >
              Send
            </button>
          </div>

          {messages.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 2).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="rounded-full border border-[#22324a] bg-[#0f1729] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default WizardAssist;
