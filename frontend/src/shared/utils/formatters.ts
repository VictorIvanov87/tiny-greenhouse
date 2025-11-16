export const parseHours = (input?: string | number | null): number | null => {
  if (typeof input === 'number' && !Number.isNaN(input)) {
    return input;
  }

  if (!input) {
    return null;
  }

  const normalized = String(input).toLowerCase().replace(/[^0-9.\-–]/g, '').replace(/–/g, '-');
  if (!normalized) {
    return null;
  }

  const parts = normalized.split('-').map((part) => Number(part));
  const first = parts.find((value) => !Number.isNaN(value));
  return typeof first === 'number' ? first : null;
};

export const coerceNumber = (input?: string | number | null): number | null => {
  if (typeof input === 'number') {
    return Number.isNaN(input) ? null : input;
  }

  if (!input) {
    return null;
  }

  const match = String(input).match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }
  const num = Number(match[0]);
  return Number.isNaN(num) ? null : num;
};

export const isWithinBounds = (
  value: number | null | undefined,
  bounds?: { min: number; max: number },
): boolean => {
  if (typeof value !== 'number' || !bounds) {
    return true;
  }
  return value >= bounds.min && value <= bounds.max;
};
