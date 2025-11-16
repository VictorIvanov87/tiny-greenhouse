import { useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Badge,
  Card,
  Label,
  ListGroup,
  ListGroupItem,
  TextInput,
  ToggleSwitch,
} from 'flowbite-react';
import type { SetupWizardState } from '../../state';
import { isWithinBounds } from '../../../../shared/utils/formatters';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toNullableNumber = (value: string) => (value === '' ? null : Number(value));

const formatHour = (value: number) => value.toString().padStart(2, '0');

const useSummary = (prefs: SetupWizardState['prefs']) =>
  useMemo(
    () => [
      {
        label: 'Light schedule',
        value:
          typeof prefs.lightHours === 'number'
            ? `${prefs.lightHours}h · ${formatHour(prefs.lightStartHour)}:00 → ${formatHour(
                (prefs.lightStartHour + prefs.lightHours) % 24,
              )}:00`
            : 'Set hours above',
      },
      {
        label: 'Climate',
        value:
          typeof prefs.temperatureDay === 'number' && typeof prefs.temperatureNight === 'number'
            ? `${prefs.temperatureDay}°C day / ${prefs.temperatureNight}°C night · humidity ${
                prefs.humidityTarget ?? '—'
              }%`
            : 'Set day/night temps',
      },
      {
        label: 'Soil moisture',
        value: `${prefs.soilMoistureLowPct}% alert`,
      },
      {
        label: 'Timelapse',
        value: `Snapshot @ ${formatHour(prefs.timelapseHour)}:00`,
      },
      {
        label: 'Notifications',
        value: [
          prefs.notifications.email ? 'Email' : null,
          prefs.notifications.push ? 'Push' : null,
          prefs.notifications.digestDaily
            ? `Daily ${formatHour(prefs.digestHour)}:00`
            : null,
          prefs.notifications.immediate ? 'Immediate' : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Disabled',
      },
    ],
    [prefs],
  );

export const StepPrefs = ({ data, onChange }: StepProps) => {
  const defaults = data.selection.defaults;
  const bounds = defaults?.safety_bounds;
  const prefs = data.prefs;
  const summary = useSummary(prefs);

  const updatePrefs = (partial: Partial<SetupWizardState['prefs']>) => {
    onChange((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...partial,
      },
    }));
  };

  const updateNotifications = (partial: Partial<SetupWizardState['prefs']['notifications']>) => {
    updatePrefs({
      notifications: {
        ...prefs.notifications,
        ...partial,
      },
    });
  };

  const lightWarning =
    typeof prefs.lightHours === 'number'
      ? bounds?.light_hours
        ? !isWithinBounds(prefs.lightHours, bounds.light_hours)
        : prefs.lightHours < 10 || prefs.lightHours > 18
      : false;

  const climateWarnings = {
    day:
      typeof prefs.temperatureDay === 'number' &&
      !isWithinBounds(prefs.temperatureDay, bounds?.temperature_c),
    night:
      typeof prefs.temperatureNight === 'number' &&
      !isWithinBounds(prefs.temperatureNight, bounds?.temperature_c),
    humidity:
      typeof prefs.humidityTarget === 'number' &&
      !isWithinBounds(prefs.humidityTarget, bounds?.humidity_pct),
  };

  const irrigationHint = defaults?.defaults?.irrigation;

  const quietStart = prefs.quietHours?.start ?? '';
  const quietEnd = prefs.quietHours?.end ?? '';

  const updateQuietHours = (field: 'start' | 'end', value: string) => {
    const trimmed = value.trim();
    const currentStart = prefs.quietHours?.start ?? '';
    const currentEnd = prefs.quietHours?.end ?? '';
    const start = field === 'start' ? trimmed : currentStart;
    const end = field === 'end' ? trimmed : currentEnd;
    if (!start && !end) {
      updatePrefs({ quietHours: null });
      return;
    }
    updatePrefs({
      quietHours: {
        start,
        end,
      },
    });
  };

  const safetyBadges = useMemo(() => {
    if (!bounds) {
      return null;
    }
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        {bounds.temperature_c ? (
          <Badge color="light" className="border border-slate-200 text-slate-600">
            Safe temp: {bounds.temperature_c.min}–{bounds.temperature_c.max}°C
          </Badge>
        ) : null}
        {bounds.humidity_pct ? (
          <Badge color="light" className="border border-slate-200 text-slate-600">
            Safe humidity: {bounds.humidity_pct.min}–{bounds.humidity_pct.max}%
          </Badge>
        ) : null}
        {bounds.light_hours ? (
          <Badge color="light" className="border border-slate-200 text-slate-600">
            Safe light: {bounds.light_hours.min}–{bounds.light_hours.max}h
          </Badge>
        ) : null}
      </div>
    );
  }, [bounds]);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(300px,_1fr)]">
        <div className="space-y-6">
          <Card className="space-y-4 border border-slate-200 p-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lighting & timelapse</h2>
              <p className="text-sm text-slate-500">
                Seedlings typically run longer photoperiods than fruiting plants. Tune hours to your
                rig and let the wizard warn you when you leave safe bounds.
              </p>
            </div>
            {safetyBadges}
            <div className="space-y-2">
              <Label htmlFor="light-hours">Light hours per day</Label>
              <input
                id="light-hours"
                type="range"
                min={6}
                max={20}
                value={prefs.lightHours ?? 12}
                onChange={(event) =>
                  updatePrefs({ lightHours: Number(event.target.value), lightStartHour: prefs.lightStartHour })
                }
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>6h</span>
                <span>{prefs.lightHours ?? 12}h</span>
                <span>20h</span>
              </div>
              {lightWarning ? (
                <Alert color="warning" className="text-xs">
                  Outside recommended range ({bounds?.light_hours?.min ?? 10}–
                  {bounds?.light_hours?.max ?? 18}h). Override allowed.
                </Alert>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="light-start">Start hour</Label>
                <TextInput
                  id="light-start"
                  type="number"
                  min={0}
                  max={23}
                  value={prefs.lightStartHour}
                  onChange={(event) =>
                    updatePrefs({
                      lightStartHour: clamp(Number(event.target.value), 0, 23),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End hour</Label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {typeof prefs.lightHours === 'number'
                    ? `${formatHour((prefs.lightStartHour + prefs.lightHours) % 24)}:00`
                    : '—'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timelapse-hour">Timelapse hour</Label>
                <TextInput
                  id="timelapse-hour"
                  type="number"
                  min={0}
                  max={23}
                  value={prefs.timelapseHour}
                  onChange={(event) =>
                    updatePrefs({ timelapseHour: clamp(Number(event.target.value), 0, 23) })
                  }
                />
                <p className="text-xs text-slate-500">One snapshot daily</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Climate thresholds</h3>
                <p className="text-sm text-slate-500">
                  Derive starting points from the crop defaults and override when your space needs a
                  tweak.
                </p>
              </div>
            </div>
            {safetyBadges}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="temp-day">Day temperature (°C)</Label>
                <TextInput
                  id="temp-day"
                  type="number"
                  value={prefs.temperatureDay ?? ''}
                  onChange={(event) =>
                    updatePrefs({
                      temperatureDay: toNullableNumber(event.target.value),
                    })
                  }
                />
                {climateWarnings.day ? (
                  <Alert color="warning" className="text-xs">
                    Outside safe temperature bounds.
                  </Alert>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-night">Night temperature (°C)</Label>
                <TextInput
                  id="temp-night"
                  type="number"
                  value={prefs.temperatureNight ?? ''}
                  onChange={(event) =>
                    updatePrefs({
                      temperatureNight: toNullableNumber(event.target.value),
                    })
                  }
                />
                {climateWarnings.night ? (
                  <Alert color="warning" className="text-xs">
                    Outside safe temperature bounds.
                  </Alert>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="humidity-target">Humidity target (%)</Label>
                <TextInput
                  id="humidity-target"
                  type="number"
                  value={prefs.humidityTarget ?? ''}
                  onChange={(event) =>
                    updatePrefs({
                      humidityTarget: toNullableNumber(event.target.value),
                    })
                  }
                />
                {climateWarnings.humidity ? (
                  <Alert color="warning" className="text-xs">
                    Outside safe humidity bounds.
                  </Alert>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 border border-slate-200 p-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Soil moisture alerts</h3>
              <p className="text-sm text-slate-500">
                We’ll ping you when sensors drop below your threshold. Irrigation notes below come
                from the seed pack.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moisture-low">Alert when below (%)</Label>
              <input
                id="moisture-low"
                type="range"
                min={20}
                max={60}
                step={1}
                value={prefs.soilMoistureLowPct}
                onChange={(event) =>
                  updatePrefs({ soilMoistureLowPct: Number(event.target.value) })
                }
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>20%</span>
                <span>{prefs.soilMoistureLowPct}%</span>
                <span>60%</span>
              </div>
            </div>
            {irrigationHint ? (
              <Alert color="info" className="text-xs">
                {irrigationHint.method ? `${irrigationHint.method}. ` : ''}
                {irrigationHint.frequency ?? ''}
              </Alert>
            ) : null}
          </Card>

          <Card className="space-y-4 border border-slate-200 p-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Notification channels</h3>
              <p className="text-sm text-slate-500">
                Choose where alerts land. Push is marked as “coming soon” but we keep the state so
                the API can pick it up later.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3">
                <ToggleSwitch
                  checked={prefs.notifications.email}
                  label="Email"
                  onChange={(checked) => updateNotifications({ email: checked })}
                />
                <p className="text-xs text-slate-500">Weekly digests + urgent alerts.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3 opacity-60">
                <ToggleSwitch
                  checked={prefs.notifications.push}
                  label="Push (coming soon)"
                  disabled
                  onChange={(checked) => updateNotifications({ push: checked })}
                />
                <p className="text-xs text-slate-500">Real-time device alerts.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Immediate alerts</Label>
                <ToggleSwitch
                  checked={prefs.notifications.immediate}
                  onChange={(checked) => updateNotifications({ immediate: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Daily digest</Label>
                <ToggleSwitch
                  checked={prefs.notifications.digestDaily}
                  onChange={(checked) => updateNotifications({ digestDaily: checked })}
                />
              </div>
              {prefs.notifications.digestDaily ? (
                <div className="space-y-2">
                  <Label htmlFor="digest-hour">Digest at</Label>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Quiet hours start</Label>
                <TextInput
                  id="quiet-start"
                  type="time"
                  value={quietStart}
                  onChange={(event) => updateQuietHours('start', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">Quiet hours end</Label>
                <TextInput
                  id="quiet-end"
                  type="time"
                  value={quietEnd}
                  onChange={(event) => updateQuietHours('end', event.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        <Card className="space-y-4 border border-slate-200 p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Live summary</h3>
            <p className="text-sm text-slate-500">Auto-updates as you tweak the controls.</p>
          </div>
          <ListGroup className="rounded-2xl border border-slate-200">
            {summary.map((item) => (
              <ListGroupItem key={item.label} className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-600">{item.label}</span>
                <span className="text-slate-900">{item.value}</span>
              </ListGroupItem>
            ))}
          </ListGroup>
        </Card>
      </div>
    </section>
  );
};

export default StepPrefs;
