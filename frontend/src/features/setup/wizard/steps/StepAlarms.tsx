import { useState, type Dispatch, type SetStateAction } from 'react';
import { Label, TextInput } from 'flowbite-react';
import type { SetupWizardState } from '../../state';
import type { AlertRule, AlertRuleMetric, AlertRuleCondition } from '../../../notifications/api';
import WizardLayout from '../WizardLayout';
import WizardAssist from '../WizardAssist';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
};

const METRIC_LABELS: Record<AlertRuleMetric, string> = {
  temperature: '🌡️ Temperature',
  humidity: '💧 Humidity',
  soilMoisture: '🌱 Soil Moisture',
  lightLux: '☀️ Light',
};

const METRIC_UNITS: Record<AlertRuleMetric, string> = {
  temperature: '°C',
  humidity: '%',
  soilMoisture: '%',
  lightLux: 'lux',
};

const CONDITION_LABELS: Record<AlertRuleCondition, string> = {
  above: 'above',
  below: 'below',
};

const METRIC_OPTIONS: AlertRuleMetric[] = ['temperature', 'humidity', 'soilMoisture', 'lightLux'];
const CONDITION_OPTIONS: AlertRuleCondition[] = ['above', 'below'];

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatHour = (value: number) => value.toString().padStart(2, '0');

const StepAlarms = ({ data, onChange }: StepProps) => {
  const { alarmRules, prefs } = data;
  const selection = data.selection;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetric, setNewMetric] = useState<AlertRuleMetric>('temperature');
  const [newCondition, setNewCondition] = useState<AlertRuleCondition>('above');
  const [newValue, setNewValue] = useState('30');

  const updateRules = (rules: AlertRule[]) => {
    onChange((prev) => ({ ...prev, alarmRules: rules }));
  };

  const updatePrefs = (partial: Partial<SetupWizardState['prefs']>) => {
    onChange((prev) => ({ ...prev, prefs: { ...prev.prefs, ...partial } }));
  };

  const updateNotifications = (partial: Partial<SetupWizardState['prefs']['notifications']>) => {
    updatePrefs({ notifications: { ...prefs.notifications, ...partial } });
  };

  const toggleRule = (id: string) => {
    updateRules(alarmRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const deleteRule = (id: string) => {
    updateRules(alarmRules.filter((r) => r.id !== id));
  };

  const updateRuleValue = (id: string, value: number) => {
    updateRules(alarmRules.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const handleAddRule = () => {
    const value = Number(newValue);
    if (Number.isNaN(value)) return;

    const rule: AlertRule = {
      id: `custom-${Date.now()}`,
      metric: newMetric,
      condition: newCondition,
      value,
      enabled: true,
    };
    updateRules([...alarmRules, rule]);
    setShowAddForm(false);
    setNewValue('30');
  };

  const quietStart = prefs.quietHours?.start ?? '';
  const quietEnd = prefs.quietHours?.end ?? '';

  const updateQuietHours = (field: 'start' | 'end', value: string) => {
    const trimmed = value.trim();
    const start = field === 'start' ? trimmed : (prefs.quietHours?.start ?? '');
    const end = field === 'end' ? trimmed : (prefs.quietHours?.end ?? '');
    if (!start && !end) {
      updatePrefs({ quietHours: null });
      return;
    }
    updatePrefs({ quietHours: { start, end } });
  };

  const enabledCount = alarmRules.filter((r) => r.enabled).length;

  return (
    <WizardLayout
      aside={
        <WizardAssist
          cropId={selection.cropId}
          variety={selection.variety}
          stepContext="alarms-setup"
          disabled={!selection.cropId || !selection.variety}
        />
      }
    >
      <div className="space-y-6">
        {/* Alarm rules section */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">🔔 Alarm Rules</h2>
            <p className="text-sm text-slate-400">
              We've pre-configured alerts based on your crop's safety bounds.
              Toggle, tweak values, add new rules, or remove ones you don't need.
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              {enabledCount} active rule{enabledCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            {alarmRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  rule.enabled
                    ? 'border-[#22324a] bg-[#0f1729]'
                    : 'border-[#1f2a3d] bg-[#0f1729]/50 opacity-60'
                }`}
              >
                <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-200">
                    {METRIC_LABELS[rule.metric]}
                  </span>
                  <span className="mx-2 text-sm text-slate-400">
                    {CONDITION_LABELS[rule.condition]}
                  </span>
                  <input
                    type="number"
                    value={rule.value}
                    onChange={(e) => updateRuleValue(rule.id, Number(e.target.value))}
                    className="inline-block w-16 rounded-lg border border-[#22324a] bg-[#111c2d] px-2 py-1 text-center text-sm text-slate-100 outline-none focus:border-emerald-500/50"
                  />
                  <span className="ml-1 text-sm text-slate-400">
                    {METRIC_UNITS[rule.metric]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRule(rule.id)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-900/30 hover:text-red-400"
                  title="Remove rule"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}

            {alarmRules.length === 0 ? (
              <div className="rounded-xl border border-[#22324a] bg-[#0f1729] px-4 py-6 text-center text-sm text-slate-400">
                No alarm rules yet. Add one below to get started.
              </div>
            ) : null}
          </div>

          {showAddForm ? (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Metric</label>
                  <select
                    value={newMetric}
                    onChange={(e) => setNewMetric(e.target.value as AlertRuleMetric)}
                    className="w-full rounded-lg border border-[#22324a] bg-[#0f1729] px-2 py-2 text-sm text-slate-100 outline-none"
                  >
                    {METRIC_OPTIONS.map((m) => (
                      <option key={m} value={m}>{METRIC_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as AlertRuleCondition)}
                    className="w-full rounded-lg border border-[#22324a] bg-[#0f1729] px-2 py-2 text-sm text-slate-100 outline-none"
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Value</label>
                  <input
                    type="number"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full rounded-lg border border-[#22324a] bg-[#0f1729] px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-600/20"
                >
                  Add rule
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-[#22324a] px-4 py-1.5 text-sm text-slate-400 transition hover:border-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-3 w-full rounded-xl border border-dashed border-[#22324a] px-4 py-3 text-sm text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
            >
              + Add alarm rule
            </button>
          )}
        </div>

        {/* Notification channels */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">📬 Notification Channels</h2>
            <p className="text-sm text-slate-400">
              Choose how you'd like to receive alerts.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-[#22324a] bg-[#0f1729] p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">📧 Email</p>
                  <p className="text-xs text-slate-400">Digests + urgent alerts</p>
                </div>
                <Toggle checked={prefs.notifications.email} onChange={(v) => updateNotifications({ email: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#22324a] bg-[#0f1729] p-4 opacity-50">
                <div>
                  <p className="text-sm font-medium text-slate-200">📱 Push</p>
                  <p className="text-xs text-slate-400">Coming soon</p>
                </div>
                <Toggle checked={prefs.notifications.push} onChange={(v) => updateNotifications({ push: v })} disabled />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-[#22324a] bg-[#0f1729] p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">⚡ Immediate alerts</p>
                  <p className="text-xs text-slate-400">Get notified right away</p>
                </div>
                <Toggle checked={prefs.notifications.immediate} onChange={(v) => updateNotifications({ immediate: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#22324a] bg-[#0f1729] p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">📊 Daily digest</p>
                  <p className="text-xs text-slate-400">Summary once a day</p>
                </div>
                <Toggle checked={prefs.notifications.digestDaily} onChange={(v) => updateNotifications({ digestDaily: v })} />
              </div>
            </div>

            {prefs.notifications.digestDaily ? (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="digest-hour" className="text-slate-300">Digest at</Label>
                <TextInput
                  id="digest-hour"
                  type="time"
                  value={`${formatHour(prefs.digestHour)}:00`}
                  onChange={(event) => {
                    const [hour] = event.target.value.split(':');
                    updatePrefs({ digestHour: clamp(Number(hour), 0, 23) });
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Quiet hours */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">🌙 Quiet Hours</h2>
            <p className="text-sm text-slate-400">
              Silence non-critical notifications during these hours. Leave empty to disable.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quiet-start" className="text-slate-300">Start</Label>
              <TextInput
                id="quiet-start"
                type="time"
                value={quietStart}
                onChange={(event) => updateQuietHours('start', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end" className="text-slate-300">End</Label>
              <TextInput
                id="quiet-end"
                type="time"
                value={quietEnd}
                onChange={(event) => updateQuietHours('end', event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
};

export default StepAlarms;
