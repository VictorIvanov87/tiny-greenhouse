import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button, Card } from 'flowbite-react';
import { getNotificationPrefs, updateNotificationPrefs } from './api';
import type { AlertRule, AlertRuleCondition, AlertRuleMetric, NotificationPrefs } from './api';
import { getCropDefaults } from '../setup/api';
import type { SetupProfile, BoundedMetric } from '../setup/state';

type PageContext = { profile: SetupProfile };

const CARD_CLASS =
  'rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]';
const INNER_CLASS = 'rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4';

const fieldStyle: React.CSSProperties = {
  backgroundColor: '#0b1220',
  color: '#e2e8f0',
  borderColor: '#22324a',
};

type SafetyBounds = {
  temperature_c?: BoundedMetric;
  humidity_pct?: BoundedMetric;
  light_hours?: BoundedMetric;
};

const METRICS: { value: AlertRuleMetric; label: string; unit: string }[] = [
  { value: 'temperature', label: 'Temperature', unit: '°C' },
  { value: 'humidity', label: 'Humidity', unit: '%' },
  { value: 'soilMoisture', label: 'Soil moisture', unit: '%' },
  { value: 'lightLux', label: 'Light', unit: 'lux' },
];

const CONDITIONS: { value: AlertRuleCondition; label: string }[] = [
  { value: 'below', label: 'Below' },
  { value: 'above', label: 'Above' },
];

const metricUnit = (metric: AlertRuleMetric) => METRICS.find((m) => m.value === metric)?.unit ?? '';

const newRuleId = () =>
  crypto.randomUUID?.() ?? `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <label className="inline-flex cursor-pointer items-center">
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <div className="peer relative h-6 w-11 rounded-full bg-gray-700 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-600 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rtl:peer-checked:after:-translate-x-full" />
  </label>
);

const getBoundsForMetric = (
  metric: AlertRuleMetric,
  bounds: SafetyBounds
): BoundedMetric | null => {
  switch (metric) {
    case 'temperature':
      return bounds.temperature_c ?? null;
    case 'humidity':
      return bounds.humidity_pct ?? null;
    case 'lightLux':
      return bounds.light_hours ?? null;
    default:
      return null;
  }
};

const RuleRow = ({
  rule,
  onChange,
  onDelete,
  disabled,
  bounds,
  plantType,
}: {
  rule: AlertRule;
  onChange: (updated: AlertRule) => void;
  onDelete: () => void;
  disabled?: boolean;
  bounds: SafetyBounds;
  plantType?: string;
}) => {
  const range = getBoundsForMetric(rule.metric, bounds);
  const unit = metricUnit(rule.metric);
  const plantLabel = plantType ? plantType.replace(/-/g, ' ') : 'your plant';

  return (
    <div className={INNER_CLASS}>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          checked={rule.enabled}
          onChange={(enabled) => onChange({ ...rule, enabled })}
          disabled={disabled}
        />

        <select
          value={rule.metric}
          onChange={(e) => onChange({ ...rule, metric: e.target.value as AlertRuleMetric })}
          disabled={disabled}
          className="w-36 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#3b5998]"
          style={fieldStyle}
        >
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={rule.condition}
          onChange={(e) => onChange({ ...rule, condition: e.target.value as AlertRuleCondition })}
          disabled={disabled}
          className="w-24 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#3b5998]"
          style={fieldStyle}
        >
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={rule.value}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange({ ...rule, value: v });
            }}
            disabled={disabled}
            className="w-24 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#3b5998]"
            style={fieldStyle}
          />
          <span className="text-xs text-slate-400">{unit}</span>
        </div>

        <Button
          onClick={onDelete}
          disabled={disabled}
          color="gray"
          outline={true}
          className="ml-auto"
          title="Delete rule"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>

      {range && (
        <p className="mt-2 text-xs text-slate-500">
          Recommended range for {plantLabel} is: {range.min}–{range.max}
          {unit}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NotificationsPage = () => {
  const { profile } = useOutletContext<PageContext>();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [bounds, setBounds] = useState<SafetyBounds>({});

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data = await getNotificationPrefs();
      setPrefs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  // Load crop safety bounds for hints
  useEffect(() => {
    if (!profile.cropId || !profile.variety) return;
    getCropDefaults(profile.cropId, profile.variety)
      .then((defaults) => {
        if (defaults.safety_bounds) setBounds(defaults.safety_bounds);
      })
      .catch(() => {});
  }, [profile.cropId, profile.variety]);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateNotificationPrefs(prefs);
      setPrefs(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (index: number, updated: AlertRule) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const rules = [...prev.rules];
      rules[index] = updated;
      return { ...prev, rules };
    });
  };

  const deleteRule = (index: number) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, rules: prev.rules.filter((_, i) => i !== index) };
    });
  };

  const addRule = () => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const rule: AlertRule = {
        id: newRuleId(),
        metric: 'temperature',
        condition: 'above',
        value: 30,
        enabled: true,
      };
      return { ...prev, rules: [...prev.rules, rule] };
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
            Notification preferences
          </h1>
          <p className="text-sm text-slate-400">Configure how and when you get alerted.</p>
        </div>
        <Card className={CARD_CLASS}>
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="skeleton h-6 w-40" />
          </div>
        </Card>
      </div>
    );
  }

  // Error state (no prefs loaded)
  if (error && !prefs) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
            Notification preferences
          </h1>
          <p className="text-sm text-slate-400">Configure how and when you get alerted.</p>
        </div>
        <Card className={CARD_CLASS}>
          <p className="text-sm text-rose-400">{error}</p>
          <Button color="gray" outline={true} onClick={fetchPrefs} className="mt-3">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Notification preferences
        </h1>
        <p className="text-sm text-slate-400">Configure how and when you get alerted.</p>
      </div>

      {/* Status messages */}
      {saved && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
          Preferences saved successfully.
        </div>
      )}
      {error && prefs && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            border: '1px solid rgba(244,63,94,0.3)',
            backgroundColor: 'rgba(136,19,55,0.3)',
            color: '#fda4af',
          }}
        >
          Save failed: {error}
        </div>
      )}

      {/* Channels card */}
      <Card className={CARD_CLASS}>
        <p className="text-sm font-semibold text-slate-100">Notification channels</p>

        <div className="space-y-3">
          <div className={`${INNER_CLASS} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-sm font-medium text-slate-100">Email alerts</p>
              <p className="text-xs text-slate-400">Send urgent events directly to your inbox.</p>
            </div>
            <Toggle
              checked={prefs.email}
              onChange={(v) => setPrefs({ ...prefs, email: v })}
              disabled={saving}
            />
          </div>

          <div className={`${INNER_CLASS} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-sm font-medium text-slate-100">Push alerts</p>
              <p className="text-xs text-slate-400">
                Browser/device notifications.{' '}
                <span className="italic text-slate-500">Coming soon</span>
              </p>
            </div>
            <Toggle
              checked={prefs.push}
              onChange={(v) => setPrefs({ ...prefs, push: v })}
              disabled={saving}
            />
          </div>
        </div>
      </Card>

      {/* Alert rules card */}
      <Card className={CARD_CLASS}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Alert rules</p>
            <p className="text-xs text-slate-400">
              Get alerted when a sensor value crosses a threshold.
            </p>
          </div>
          <Button color="gray" outline={true} onClick={addRule} disabled={saving}>
            + Add rule
          </Button>
        </div>

        {prefs.rules.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No alert rules configured. Add one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {prefs.rules.map((rule, i) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onChange={(updated) => updateRule(i, updated)}
                onDelete={() => deleteRule(i)}
                disabled={saving}
                bounds={bounds}
                plantType={profile.plantType}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} color="green" outline={true} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </Button>
        <Button color="red" outline={true} onClick={fetchPrefs} disabled={saving}>
          Reset
        </Button>
      </div>
    </div>
  );
};

export default NotificationsPage;
