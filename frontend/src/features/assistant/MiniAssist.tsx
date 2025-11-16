import { useState } from 'react';
import { Alert, Badge, Button, Spinner, Textarea } from 'flowbite-react';
import { sendAssistMessage } from './api';
import type { AssistantAnswer } from './api';

type MiniAssistProps = {
  cropId?: string;
  variety?: string;
  disabled?: boolean;
};

export const MiniAssist = ({ cropId, variety, disabled }: MiniAssistProps) => {
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || disabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendAssistMessage({
        message: message.trim(),
        cropId,
        variety,
        topK: 6,
        temperature: 0.2,
      });
      setAnswer(response);
      setMessage('');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Assistant request failed';
      setError(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Ask Assistant</h3>
          <p className="text-xs text-slate-500">
            Quick context-aware answers powered by `/api/assist`.
          </p>
        </div>
        {loading ? <Spinner size="sm" /> : null}
      </div>
      {disabled ? (
        <Alert color="info" className="text-sm">
          Pick a supported variety to target assistant replies.
        </Alert>
      ) : null}
      <Textarea
        rows={4}
        value={message}
        disabled={disabled || loading}
        placeholder="e.g. How many hours of light should seedlings get?"
        onChange={(event) => setMessage(event.target.value)}
      />
      <Button onClick={handleSend} disabled={disabled || loading || !message.trim()}>
        {loading ? 'Asking…' : 'Send'}
      </Button>
      {error ? (
        <Alert color="failure" className="text-sm">
          {error}
        </Alert>
      ) : null}
      {answer ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
          <p>{answer.message}</p>
          {answer.sources && answer.sources.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {answer.sources.slice(0, 3).map((source) => (
                <Badge key={source.id} color="gray" className="text-[11px]">
                  {source.sourcePath}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
