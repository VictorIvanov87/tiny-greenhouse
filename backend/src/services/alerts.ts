import { Alert, AlertSeverity, AlertType } from '../lib/schemas';
import { getUserPrefs } from './prefs';
import { getLatestTelemetry } from './telemetry';

type Store = {
  active: Map<string, Alert>;
  history: Alert[];
};

const stores = new Map<string, Store>();

const HYSTERESIS = {
  soil: 2,
  temp: 1,
};

const STALE_WARN_MINUTES = 10;
const STALE_CRITICAL_MINUTES = 60;
const HISTORY_CAP = 500;

const getStore = (uid: string): Store => {
  let store = stores.get(uid);
  if (!store) {
    store = { active: new Map(), history: [] };
    stores.set(uid, store);
  }
  return store;
};

const findActiveByType = (store: Store, type: AlertType) =>
  Array.from(store.active.values()).find((alert) => alert.type === type);

const nextId = (type: AlertType) => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const upsertAlert = (uid: string, alert: Omit<Alert, 'id' | 'acknowledged' | 'resolvedAt'>) => {
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
    acknowledged: false,
    resolvedAt: undefined,
    ...alert,
  };
  store.active.set(record.id, record);
  return record;
};

const resolveAlert = (uid: string, type: AlertType, resolvedAt: string) => {
  const store = getStore(uid);
  const existing = findActiveByType(store, type);
  if (!existing) {
    return;
  }

  store.active.delete(existing.id);
  store.history.unshift({ ...existing, resolvedAt });
  if (store.history.length > HISTORY_CAP) {
    store.history.length = HISTORY_CAP;
  }
};

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
    resolveAlert(uid, 'SENSOR_STALE', now.toISOString());
  }

  const soilThreshold = prefs.thresholds.soilMoistureLow;
  if (latest.soilMoisture < soilThreshold) {
    upsertAlert(uid, {
      type: 'SOIL_MOISTURE_LOW',
      severity: 'warn',
      message: `Soil moisture low: ${latest.soilMoisture}% < ${soilThreshold}%`,
      startedAt: latest.timestamp,
      value: latest.soilMoisture,
      threshold: soilThreshold,
    });
  } else if (latest.soilMoisture >= soilThreshold + HYSTERESIS.soil) {
    resolveAlert(uid, 'SOIL_MOISTURE_LOW', now.toISOString());
  }

  const tempThreshold = prefs.thresholds.tempHigh;
  if (latest.temperature > tempThreshold) {
    upsertAlert(uid, {
      type: 'TEMP_HIGH',
      severity: 'warn',
      message: `Temperature high: ${latest.temperature}°C > ${tempThreshold}°C`,
      startedAt: latest.timestamp,
      value: latest.temperature,
      threshold: tempThreshold,
    });
  } else if (latest.temperature <= tempThreshold - HYSTERESIS.temp) {
    resolveAlert(uid, 'TEMP_HIGH', now.toISOString());
  }
};

export const getActiveAlerts = (uid: string): Alert[] => {
  return Array.from(getStore(uid).active.values());
};

export const getAlertHistory = (uid: string, limit = 100): Alert[] => {
  return getStore(uid).history.slice(0, limit);
};

export const acknowledgeAlert = (uid: string, id: string) => {
  const store = getStore(uid);
  const alert = store.active.get(id);
  if (alert) {
    alert.acknowledged = true;
  }
};
