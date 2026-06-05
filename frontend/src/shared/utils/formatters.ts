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

export type NumericRange = { min: number; max: number };

// Parse a free-form value like "21-28 °C", "55-65%" or "24°C" into a numeric
// range. A single value yields { min, max } with both equal.
export const parseRange = (input?: string | number | null): NumericRange | null => {
  if (typeof input === 'number') {
    return Number.isNaN(input) ? null : { min: input, max: input };
  }
  if (!input) {
    return null;
  }
  const nums = String(input)
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((n) => !Number.isNaN(n));
  if (!nums || nums.length === 0) {
    return null;
  }
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

// Representative single value (rounded midpoint) for a recommended range —
// e.g. "21-28 °C" → 25. Used to derive a climate setpoint from a crop range.
export const rangeMidpoint = (input?: string | number | null): number | null => {
  const range = parseRange(input);
  return range ? Math.round((range.min + range.max) / 2) : null;
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
