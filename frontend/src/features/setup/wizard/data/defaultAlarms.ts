import type { AlertRule } from '../../../notifications/api';
import type { BoundedMetric, CropDefaults } from '../../state';

// Pull every positive number out of a free-form value like "21-28 °C",
// "55-65%" or "24°C" so we can turn a recommended range into alarm bounds.
const extractNumbers = (value?: string): number[] => {
  if (!value) return [];
  const matches = value.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number).filter((n) => !Number.isNaN(n)) : [];
};

const parseRange = (value?: string): BoundedMetric | undefined => {
  const nums = extractNumbers(value);
  if (nums.length === 0) return undefined;
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

export const generateDefaultAlarms = (defaults: CropDefaults): AlertRule[] => {
  const env = defaults.defaults?.environment;
  const bounds = defaults.safety_bounds;
  const rules: AlertRule[] = [];

  // Temperature — alarm when leaving the recommended day range (below the low
  // end, above the high end). When the day temp is a single value, widen the
  // low bound with the night temp. Falls back to absolute safety bounds.
  const dayTemp = parseRange(env?.temperature_day);
  const nightTemp = parseRange(env?.temperature_night);
  let tempLow: number | undefined;
  let tempHigh: number | undefined;
  if (dayTemp) {
    tempHigh = dayTemp.max;
    tempLow = dayTemp.min < dayTemp.max ? dayTemp.min : nightTemp?.min ?? dayTemp.min;
  } else if (bounds?.temperature_c) {
    tempLow = bounds.temperature_c.min;
    tempHigh = bounds.temperature_c.max;
  }
  if (typeof tempLow === 'number' && typeof tempHigh === 'number') {
    rules.push({
      id: 'default-temp-low',
      metric: 'temperature',
      condition: 'below',
      value: Math.round(tempLow),
      enabled: true,
    });
    rules.push({
      id: 'default-temp-high',
      metric: 'temperature',
      condition: 'above',
      value: Math.round(tempHigh),
      enabled: true,
    });
  }

  // Humidity — recommended range, falling back to safety bounds.
  const humidity = parseRange(env?.humidity) ?? bounds?.humidity_pct;
  if (humidity) {
    rules.push({
      id: 'default-humidity-low',
      metric: 'humidity',
      condition: 'below',
      value: Math.round(humidity.min),
      enabled: true,
    });
    rules.push({
      id: 'default-humidity-high',
      metric: 'humidity',
      condition: 'above',
      value: Math.round(humidity.max),
      enabled: true,
    });
  }

  // Soil moisture — not part of the crop dataset; keep a sensible low guard.
  rules.push({
    id: 'default-soil-low',
    metric: 'soilMoisture',
    condition: 'below',
    value: 40,
    enabled: true,
  });

  return rules;
};
