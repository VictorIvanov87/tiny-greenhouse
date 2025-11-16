import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { parse } from 'yaml';
import {
  CropDefaultsPayloadSchema,
  type CropDefaultsPayload,
} from '../lib/schemas';

const DEFAULT_TTL_MS = 60_000;
const ttlValue =
  Number(process.env.CROP_DEFAULTS_TTL_MS ?? DEFAULT_TTL_MS) || DEFAULT_TTL_MS;
const CACHE_TTL_MS = ttlValue > 0 ? ttlValue : DEFAULT_TTL_MS;

const candidateRoots = [
  resolve(process.cwd(), '..', 'data', 'rag', 'crops'),
  resolve(process.cwd(), 'data', 'rag', 'crops'),
];

const ragRoot = candidateRoots.find((dir) => existsSync(dir)) ?? candidateRoots[0];

const cache = new Map<string, { expiresAt: number; payload: CropDefaultsPayload }>();

const shouldBypassCache = () => (process.env.RAG_DEBUG ?? '').toLowerCase() === 'true';

const buildPath = (...segments: string[]) => {
  const fullPath = resolve(ragRoot, ...segments);
  const rel = relative(ragRoot, fullPath);
  if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
    throw new Error('Invalid path outside RAG root');
  }
  return fullPath;
};

const readYamlFile = async (cropId: string, variety: string) => {
  const candidates = [
    buildPath(cropId, variety, `${variety}.yaml`),
    buildPath(cropId, `${variety}.yaml`),
  ];

  for (const filePath of candidates) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  return null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toRange = (value: unknown): { min: number; max: number } | undefined => {
  if (Array.isArray(value) && value.length >= 2) {
    const [min, max] = value;
    if (typeof min === 'number' && typeof max === 'number') {
      return { min, max };
    }
  }

  if (isPlainObject(value)) {
    const min = value.min;
    const max = value.max;
    if (typeof min === 'number' && typeof max === 'number') {
      return { min, max };
    }
  }

  return undefined;
};

const toRangeString = (value: unknown, unit = '') => {
  const range = toRange(value);
  if (!range) {
    return undefined;
  }
  const suffix = unit ? ` ${unit}` : '';
  return `${range.min}-${range.max}${suffix}`;
};

const toStringValue = (value: unknown, unit = ''): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return `${value}${unit ? ` ${unit}` : ''}`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item) ?? '').filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const collectNotes = (values: unknown[]): string | undefined => {
  const parts = values
    .map((value) => toStringValue(value))
    .filter((value): value is string => Boolean(value));
  if (!parts.length) {
    return undefined;
  }
  return parts.join(' | ');
};

const mapEnvironmentDefaults = (value: unknown) => {
  if (!isPlainObject(value)) {
    return undefined;
  }
  const temperature_day =
    toRangeString(value.temperature_day_c, '°C') ?? toStringValue(value.temperature_day);
  const temperature_night =
    toRangeString(value.temperature_night_c, '°C') ?? toStringValue(value.temperature_night);
  const humidity = toRangeString(value.humidity_pct, '%') ?? toStringValue(value.humidity);
  const light_hours = toStringValue(value.light_hours);

  const result: NonNullable<CropDefaultsPayload['defaults']>['environment'] = {};
  if (temperature_day) result.temperature_day = temperature_day;
  if (temperature_night) result.temperature_night = temperature_night;
  if (humidity) result.humidity = humidity;
  if (light_hours) result.light_hours = light_hours;

  return Object.keys(result).length ? result : undefined;
};

const mapIrrigationDefaults = (value: unknown) => {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const method = toStringValue(value.method);
  const wateringRule = toStringValue(value.watering_rule);
  const frequency =
    toStringValue(value.frequency) ?? toStringValue(value.cadence) ?? wateringRule;
  const notes = collectNotes([
    value.notes,
    frequency === wateringRule ? undefined : wateringRule,
    value.soil_mix,
    value.substrate,
    value.nutrient_ec,
    value.feed_note,
  ]);

  const result: NonNullable<CropDefaultsPayload['defaults']>['irrigation'] = {};
  if (method) result.method = method;
  if (frequency) result.frequency = frequency;
  if (notes) result.notes = notes;

  return Object.keys(result).length ? result : undefined;
};

const mapContainerDefaults = (value: unknown) => {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const volume_liters =
    toRangeString(value.volume_liters, 'L') ??
    toRangeString(value.pot_volume_l, 'L') ??
    toRangeString(value.bag_volume_l, 'L') ??
    toStringValue(value.volume_liters ?? value.pot_volume_l ?? value.bag_volume_l, 'L');

  const diameter_cm = toStringValue(value.diameter_cm, 'cm');
  const depth_cm = toStringValue(value.depth_cm, 'cm');

  const result: NonNullable<CropDefaultsPayload['defaults']>['container'] = {};
  if (volume_liters) result.volume_liters = volume_liters;
  if (diameter_cm) result.diameter_cm = diameter_cm;
  if (depth_cm) result.depth_cm = depth_cm;

  return Object.keys(result).length ? result : undefined;
};

const mapOperations = (value: unknown) => {
  if (!isPlainObject(value)) {
    return undefined;
  }
  return value;
};

const mapSafetyBounds = (value: unknown) => {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const temperature_c = toRange(value.temperature_c);
  const humidity_pct = toRange(value.humidity_pct);
  const light_hours = toRange(value.light_hours);

  const bounds: CropDefaultsPayload['safety_bounds'] = {};
  if (temperature_c) bounds.temperature_c = temperature_c;
  if (humidity_pct) bounds.humidity_pct = humidity_pct;
  if (light_hours) bounds.light_hours = light_hours;

  return Object.keys(bounds).length ? bounds : undefined;
};

const mapStages = (value: unknown): CropDefaultsPayload['stages'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const stages: CropDefaultsPayload['stages'] = [];
  for (const stage of value) {
    if (!isPlainObject(stage)) {
      continue;
    }
    const id = typeof stage.id === 'string' ? stage.id : undefined;
    if (!id) {
      continue;
    }
    const cues = Array.isArray(stage.cues)
      ? stage.cues.filter((cue): cue is string => typeof cue === 'string')
      : undefined;
    stages.push({
      id,
      ...(typeof stage.label === 'string' ? { label: stage.label } : {}),
      ...(typeof stage.guidance === 'string' ? { guidance: stage.guidance } : {}),
      ...(cues && cues.length ? { cues } : {}),
    });
  }

  return stages;
};

const projectPayload = (raw: unknown, cropId: string, variety: string): CropDefaultsPayload => {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid crop YAML payload');
  }

  const crop = isPlainObject(raw.crop) ? raw.crop : {};
  const lang = typeof crop.lang === 'string' ? crop.lang : 'en';
  const displayName = typeof crop.displayName === 'string' ? crop.displayName : null;
  const overview = typeof raw.overview === 'string' ? raw.overview : null;
  const defaultsSection = isPlainObject(raw.defaults) ? raw.defaults : {};
  const environmentDefaults = mapEnvironmentDefaults(defaultsSection.environment);
  const irrigationDefaults = mapIrrigationDefaults(defaultsSection.irrigation);
  const containerDefaults = mapContainerDefaults(defaultsSection.container);
  const operationsDefaults = mapOperations(defaultsSection.operations);
  const defaults =
    environmentDefaults || irrigationDefaults || containerDefaults || operationsDefaults
      ? {
          ...(environmentDefaults ? { environment: environmentDefaults } : {}),
          ...(irrigationDefaults ? { irrigation: irrigationDefaults } : {}),
          ...(containerDefaults ? { container: containerDefaults } : {}),
          ...(operationsDefaults ? { operations: operationsDefaults } : {}),
        }
      : undefined;

  const safety_bounds = mapSafetyBounds(raw.safety_bounds);
  const stages = mapStages(raw.stages);

  return CropDefaultsPayloadSchema.parse({
    cropId,
    variety,
    lang,
    displayName,
    overview,
    defaults,
    safety_bounds,
    stages,
  });
};

export class CropDefaultsNotFoundError extends Error {
  constructor(message = 'Crop defaults not found') {
    super(message);
    this.name = 'CropDefaultsNotFoundError';
  }
}

export const getCropDefaults = async (
  cropId: string,
  variety: string,
): Promise<CropDefaultsPayload> => {
  const cacheKey = `${cropId}:${variety}`;
  if (!shouldBypassCache()) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }
    if (cached) {
      cache.delete(cacheKey);
    }
  }

  const rawContent = await readYamlFile(cropId, variety);
  if (!rawContent) {
    throw new CropDefaultsNotFoundError();
  }

  let parsed: unknown;
  try {
    parsed = parse(rawContent);
  } catch (error) {
    throw error;
  }

  const payload = projectPayload(parsed, cropId, variety);

  if (!shouldBypassCache()) {
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  }

  return payload;
};
