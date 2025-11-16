import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Alert, Label, ToggleSwitch } from 'flowbite-react';
import type { SetupWizardState, BoundedMetric } from '../../state';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PrefCard = ({
  label,
  value,
  unit,
  min,
  max,
  recommended,
  bounds,
  onChange,
}: {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  recommended?: string;
  bounds?: BoundedMetric;
  onChange: (next: number) => void;
}) => {
  const isOutOfBounds =
    value !== null &&
    bounds &&
    (value < (bounds.min ?? -Infinity) || value > (bounds.max ?? Infinity));

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-slate-800">{label}</Label>
          {recommended ? (
            <p className="text-xs text-slate-500">Suggestion: {recommended}</p>
          ) : null}
        </div>
        <span className="text-base font-semibold text-slate-900">
          {value !== null ? `${value} ${unit}` : '—'}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="w-full accent-emerald-500"
      />
      {isOutOfBounds && bounds ? (
        <Alert color="warning" className="text-xs">
          Outside recommended range ({bounds.min}–{bounds.max} {unit})
        </Alert>
      ) : null}
    </div>
  );
};

export const StepPrefs = ({ data, onChange }: StepProps) => {
  const defaults = data.selection.defaults;
  const bounds = defaults?.safety_bounds;
  const prefs = data.prefs;

  const recommendedLight = defaults?.defaults?.environment?.light_hours ?? '12–14';
  const recommendedTemp = defaults?.defaults?.environment?.temperature_day ?? '22–28';
  const recommendedHumidity = defaults?.defaults?.environment?.humidity ?? '45–60%';

  const updatePrefs = (partial: Partial<SetupWizardState['prefs']>) => {
    onChange((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...partial,
      },
    }));
  };

  const notificationCopy = useMemo(
    () => [
      {
        key: 'email' as const,
        title: 'Email notifications',
        description: 'Weekly digests and major alert summaries.',
      },
      {
        key: 'push' as const,
        title: 'Push notifications',
        description: 'Real-time warnings when thresholds are crossed.',
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Alarms & preferences</h2>
        <p className="text-sm text-slate-500">
          These values are local-only for now. We derive starting points from the selected crop but
          you can override them — we will simply warn when outside documented safety bounds.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <PrefCard
          label="Daily light exposure"
          value={prefs.lightHours}
          unit="hrs"
          min={6}
          max={20}
          recommended={recommendedLight}
          bounds={bounds?.light_hours}
          onChange={(next) => updatePrefs({ lightHours: next })}
        />
        <PrefCard
          label="High temperature alert"
          value={prefs.temperatureCeiling}
          unit="°C"
          min={18}
          max={40}
          recommended={recommendedTemp}
          bounds={bounds?.temperature_c}
          onChange={(next) => updatePrefs({ temperatureCeiling: next })}
        />
        <PrefCard
          label="Humidity comfort floor"
          value={prefs.humidityTarget}
          unit="%"
          min={20}
          max={90}
          recommended={recommendedHumidity}
          bounds={bounds?.humidity_pct}
          onChange={(next) => updatePrefs({ humidityTarget: next })}
        />
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <h3 className="text-lg font-semibold text-slate-900">Notification channels</h3>
        <p className="text-sm text-slate-500">
          Enable whichever reminders should trigger once Tiny Greenhouse hooks up to the cloud.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {notificationCopy.map((item) => (
            <div key={item.key} className="space-y-1 rounded-2xl border border-slate-200 p-3">
              <ToggleSwitch
                checked={prefs.notifications[item.key]}
                label={item.title}
                onChange={(checked) =>
                  updatePrefs({
                    notifications: {
                      ...prefs.notifications,
                      [item.key]: checked,
                    },
                  })
                }
              />
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepPrefs;
