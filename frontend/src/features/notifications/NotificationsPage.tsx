import { Alert, Button, Card, Label, Spinner, TextInput, ToggleSwitch } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { getNotificationPrefs, updateNotificationPrefs } from './api';
import type { NotificationPrefs } from './api';

const MIN_SOIL = 0;
const MAX_SOIL = 100;
const MIN_TEMP = 5;
const MAX_TEMP = 45;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type ThresholdInputs = {
  soil: string;
  temp: string;
};

const thresholdConfig = {
  soil: { field: 'soilMoistureLow', min: MIN_SOIL, max: MAX_SOIL },
  temp: { field: 'tempHigh', min: MIN_TEMP, max: MAX_TEMP },
} as const;

const NotificationsPage = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [thresholdInputs, setThresholdInputs] = useState<ThresholdInputs>({ soil: '', temp: '' });

  const syncThresholdInputs = useCallback((next: NotificationPrefs) => {
    setThresholdInputs({
      soil: String(next.thresholds.soilMoistureLow),
      temp: String(next.thresholds.tempHigh),
    });
  }, []);

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data = await getNotificationPrefs();
      setPrefs(data);
      syncThresholdInputs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [syncThresholdInputs]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = useCallback(async () => {
    if (!prefs) {
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateNotificationPrefs(prefs);
      setPrefs(updated);
      syncThresholdInputs(updated);
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save notifications';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [prefs, syncThresholdInputs]);

  const handleThresholdChange = useCallback(
    (key: keyof ThresholdInputs) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setThresholdInputs((prev) => ({ ...prev, [key]: value }));

      setPrefs((prev) => {
        if (!prev) {
          return prev;
        }

        const meta = thresholdConfig[key];
        const numeric = Number(value);
        if (Number.isNaN(numeric) || numeric < meta.min || numeric > meta.max) {
          return prev;
        }

        if (numeric === prev.thresholds[meta.field]) {
          return prev;
        }

        return {
          ...prev,
          thresholds: {
            ...prev.thresholds,
            [meta.field]: numeric,
          },
        };
      });
    },
    []
  );

  const handleThresholdBlur = useCallback(
    (key: keyof ThresholdInputs) => () => {
      const meta = thresholdConfig[key];
      const raw = thresholdInputs[key];
      const numeric = Number(raw);
      const fallback = prefs?.thresholds[meta.field] ?? meta.min;
      const clampedValue = clamp(Number.isNaN(numeric) ? fallback : numeric, meta.min, meta.max);

      setThresholdInputs((prev) => ({
        ...prev,
        [key]: String(clampedValue),
      }));

      setPrefs((prev) => {
        if (!prev || clampedValue === prev.thresholds[meta.field]) {
          return prev;
        }

        return {
          ...prev,
          thresholds: {
            ...prev.thresholds,
            [meta.field]: clampedValue,
          },
        };
      });
    },
    [prefs, thresholdInputs]
  );

  const MainContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      );
    }

    if (error && !prefs) {
      return (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Alert color="failure">
              <span className="font-semibold">Unable to load notifications.</span> {error}
            </Alert>
            <Button onClick={fetchPrefs}>Retry</Button>
          </div>
        </Card>
      );
    }

    if (!prefs) {
      return null;
    }

    return (
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-5">
          {saved && <Alert color="success">Notification preferences saved.</Alert>}
          {error && (
            <Alert color="failure">
              <span className="font-semibold">Save failed.</span> {error}
            </Alert>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Email alerts</p>
              <p className="text-sm text-slate-500">Send urgent events directly to your inbox.</p>
            </div>
            <ToggleSwitch
              checked={prefs.email}
              onChange={(checked) => setPrefs({ ...prefs, email: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Push alerts</p>
              <p className="text-sm text-slate-500">
                Browser/device notifications. (Coming soon — toggling now keeps preference synced.)
              </p>
            </div>
            <ToggleSwitch
              checked={prefs.push}
              onChange={(checked) => setPrefs({ ...prefs, push: checked })}
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="soil-threshold">Soil moisture low threshold (%)</Label>
              <TextInput
                id="soil-threshold"
                type="number"
                min={MIN_SOIL}
                max={MAX_SOIL}
                value={thresholdInputs.soil}
                disabled={saving}
                onChange={handleThresholdChange('soil')}
                onBlur={handleThresholdBlur('soil')}
              />
              <p className="text-xs text-slate-500">
                We’ll warn you when moisture drops below this level.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temp-threshold">Temperature high threshold (°C)</Label>
              <TextInput
                id="temp-threshold"
                type="number"
                min={MIN_TEMP}
                max={MAX_TEMP}
                value={thresholdInputs.temp}
                disabled={saving}
                onChange={handleThresholdChange('temp')}
                onBlur={handleThresholdBlur('temp')}
              />
              <p className="text-xs text-slate-500">
                Alert when your greenhouse runs hotter than this.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              Save preferences
            </Button>
            <Button color="light" onClick={fetchPrefs} disabled={saving}>
              Reset
            </Button>
          </div>
        </div>
      </Card>
    );
  }, [
    error,
    fetchPrefs,
    handleSave,
    handleThresholdBlur,
    handleThresholdChange,
    loading,
    prefs,
    saving,
    saved,
    thresholdInputs.soil,
    thresholdInputs.temp,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Notification preferences
        </h1>
        <p className="text-sm text-slate-500">
          Decide how Tiny Greenhouse keeps your team informed when something needs attention.
        </p>
      </div>
      {MainContent}
    </div>
  );
};

export default NotificationsPage;
