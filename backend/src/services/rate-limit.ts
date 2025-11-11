export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.retryAfter = retryAfterSeconds;
  }
}

type Counter = {
  count: number;
  resetAt: number;
};

const windowStore = new Map<string, Counter>();

export const assertRateLimit = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  let counter = windowStore.get(key);

  if (!counter || now >= counter.resetAt) {
    counter = { count: 0, resetAt: now + windowMs };
  }

  if (counter.count >= limit) {
    const retryAfterMs = counter.resetAt - now;
    throw new RateLimitError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }

  counter.count += 1;
  windowStore.set(key, counter);
};
