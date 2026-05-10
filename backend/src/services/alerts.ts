import { Alert, AlertSeverity, AlertType, type AlertRule, type AlertRuleMetric } from '../lib/schemas';
import { getUserPrefs } from './prefs';
import { getLatestTelemetry } from './telemetry';

type Store = {
  active: Map<string, Alert>;
};

const stores = new Map<string, Store>();

const HYSTERESIS: Record<AlertRuleMetric, number> = {
  soilMoisture: 2,
  temperature: 1,
  humidity: 2,
  lightLux: 500,
};

const STALE_WARN_MINUTES = 10;
const STALE_CRITICAL_MINUTES = 60;

// Suppress SENSOR_STALE during cold-start window: the IoT Hub consumer takes
// ~10–30 s to reconnect and drain pending events. Without this, the very first
// /api/alerts call after a wake fires a false stale alert that resolves on the
// next refresh.
const WARMUP_GRACE_MS = 90_000;
const processStartedAt = Date.now();

const getStore = (uid: string): Store => {
  let store = stores.get(uid);
  if (!store) {
    store = { active: new Map() };
    stores.set(uid, store);
  }
  return store;
};

const findActiveByType = (store: Store, type: AlertType) =>
  Array.from(store.active.values()).find((alert) => alert.type === type);

const nextId = (type: AlertType) => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const upsertAlert = (uid: string, alert: Omit<Alert, 'id'>) => {
  const store = getStore(uid);
  const existing = findActiveByType(store, alert.type);

  if (existing) {
    existing.severity = alert.severity;
    existing.message = alert.message;
    existing.value = alert.value;
    existing.threshold = alert.threshold;
    existing.sensor = alert.sensor;
    return existing;
  }

  const record: Alert = {
    id: nextId(alert.type),
    ...alert,
  };
  store.active.set(record.id, record);
  return record;
};

const resolveAlert = (uid: string, type: AlertType) => {
  const store = getStore(uid);
  const existing = findActiveByType(store, type);
  if (!existing) return;
  store.active.delete(existing.id);
};

// ---------------------------------------------------------------------------
// Map a rule to an AlertType
// ---------------------------------------------------------------------------

const METRIC_UNITS: Record<AlertRuleMetric, string> = {
  temperature: '°C',
  humidity: '%',
  soilMoisture: '%',
  lightLux: ' lux',
};

const METRIC_LABELS: Record<AlertRuleMetric, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  soilMoisture: 'Soil moisture',
  lightLux: 'Light',
};

const ruleToAlertType = (rule: AlertRule): AlertType => {
  const map: Record<string, AlertType> = {
    'temperature:above': 'TEMP_HIGH',
    'temperature:below': 'TEMP_LOW',
    'humidity:above': 'HUMIDITY_HIGH',
    'humidity:below': 'HUMIDITY_LOW',
    'soilMoisture:above': 'SOIL_MOISTURE_HIGH',
    'soilMoisture:below': 'SOIL_MOISTURE_LOW',
    'lightLux:above': 'LIGHT_HIGH',
    'lightLux:below': 'LIGHT_LOW',
  };
  return map[`${rule.metric}:${rule.condition}`];
};

const getSensorValue = (
  latest: { temperature: number | null; humidity: number | null; soilMoisture: number; lightLux?: number | null },
  metric: AlertRuleMetric,
): number | null => {
  switch (metric) {
    case 'temperature':
      return latest.temperature;
    case 'humidity':
      return latest.humidity;
    case 'soilMoisture':
      return latest.soilMoisture;
    case 'lightLux':
      return latest.lightLux ?? null;
  }
};

// ---------------------------------------------------------------------------
// Main recompute
// ---------------------------------------------------------------------------

export const recomputeAlerts = async (uid: string, timestamp = new Date()) => {
  const prefs = await getUserPrefs(uid);
  const latest = await getLatestTelemetry(uid);
  const now = timestamp;

  if (!latest) {
    upsertAlert(uid, {
      type: 'SENSOR_STALE',
      severity: 'critical',
      message: 'No telemetry data available',
      startedAt: now.toISOString(),
    });
    return;
  }

  const sampleTime = Date.parse(latest.timestamp);
  if (!Number.isFinite(sampleTime)) {
    return;
  }

  const minutesSince = (now.getTime() - sampleTime) / 60000;
  const inWarmup = now.getTime() - processStartedAt < WARMUP_GRACE_MS;

  // --- Staleness check (always runs, not rule-based). Skipped during the
  // cold-start grace window so the IoT Hub consumer has time to drain its
  // backlog before we judge whether data is "stale".
  if (!inWarmup) {
    if (minutesSince >= STALE_WARN_MINUTES) {
      const severity: AlertSeverity = minutesSince >= STALE_CRITICAL_MINUTES ? 'critical' : 'warn';
      upsertAlert(uid, {
        type: 'SENSOR_STALE',
        severity,
        message:
          severity === 'critical'
            ? 'Sensor data is stale for over an hour'
            : 'Sensor data is stale',
        startedAt: latest.timestamp,
      });
    } else {
      resolveAlert(uid, 'SENSOR_STALE');
    }
  }

  // --- Reservoir empty (water-level float switch went LOW) ---
  if (latest.waterLevelLow) {
    upsertAlert(uid, {
      type: 'WATER_LEVEL_LOW',
      severity: 'critical',
      message: 'Water reservoir is empty — refill to resume automatic watering',
      startedAt: latest.timestamp,
    });
  } else {
    resolveAlert(uid, 'WATER_LEVEL_LOW');
  }

  // --- Special case: soil moisture = 0 means sensor broken ---
  if (latest.soilMoisture === 0) {
    upsertAlert(uid, {
      type: 'SOIL_MOISTURE_LOW',
      severity: 'critical',
      message: 'Soil moisture sensor not responding — check wiring or replace sensor',
      startedAt: latest.timestamp,
      value: 0,
      threshold: 0,
    });
  }

  // --- Evaluate user-defined rules ---
  const activeRuleTypes = new Set<AlertType>();

  for (const rule of prefs.rules) {
    const alertType = ruleToAlertType(rule);
    if (!alertType) continue;

    // Skip soil moisture low if sensor is broken (handled above)
    if (alertType === 'SOIL_MOISTURE_LOW' && latest.soilMoisture === 0) {
      activeRuleTypes.add(alertType);
      continue;
    }

    const sensorValue = getSensorValue(latest, rule.metric);
    if (sensorValue === null) continue;

    const hysteresis = HYSTERESIS[rule.metric];
    const label = METRIC_LABELS[rule.metric];
    const unit = METRIC_UNITS[rule.metric];

    if (!rule.enabled) {
      resolveAlert(uid, alertType);
      continue;
    }

    const isTriggered =
      rule.condition === 'above'
        ? sensorValue > rule.value
        : sensorValue < rule.value;

    const isResolved =
      rule.condition === 'above'
        ? sensorValue <= rule.value - hysteresis
        : sensorValue >= rule.value + hysteresis;

    if (isTriggered) {
      activeRuleTypes.add(alertType);
      const direction = rule.condition === 'above' ? 'high' : 'low';
      upsertAlert(uid, {
        type: alertType,
        severity: 'warn',
        message: `${label} ${direction}: ${sensorValue}${unit} ${rule.condition === 'above' ? '>' : '<'} ${rule.value}${unit}`,
        startedAt: latest.timestamp,
        value: sensorValue,
        threshold: rule.value,
      });
    } else if (isResolved) {
      resolveAlert(uid, alertType);
    }
  }

  // Resolve rule-based alert types that no longer have any active rule
  const allRuleTypes: AlertType[] = [
    'SOIL_MOISTURE_LOW', 'SOIL_MOISTURE_HIGH',
    'TEMP_HIGH', 'TEMP_LOW',
    'HUMIDITY_LOW', 'HUMIDITY_HIGH',
    'LIGHT_LOW', 'LIGHT_HIGH',
  ];
  for (const type of allRuleTypes) {
    if (!activeRuleTypes.has(type) && latest.soilMoisture !== 0) {
      // No rule targets this type — resolve if still active
      const hasRule = prefs.rules.some((r) => ruleToAlertType(r) === type);
      if (!hasRule) {
        resolveAlert(uid, type);
      }
    }
  }
};

export const getActiveAlerts = (uid: string): Alert[] => {
  return Array.from(getStore(uid).active.values());
};
