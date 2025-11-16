import { ListGroup, ListGroupItem } from 'flowbite-react';
import type { SetupWizardState } from '../../state';

type StepProps = {
  data: SetupWizardState;
};

const StepReview = ({ data }: StepProps) => {
  const defaults = data.selection.defaults;
  const prefs = data.prefs;
  const summary = [
    {
      label: 'Crop selection',
      value: defaults
        ? `${defaults.cropId} ▸ ${defaults.displayName ?? prettify(defaults.variety)}`
        : 'Choose a crop above',
    },
    {
      label: 'Overview',
      value: firstParagraph(defaults?.overview) ?? '—',
    },
    {
      label: 'Light schedule',
      value:
        prefs.lightHours !== null
          ? `${prefs.lightHours} hrs · start ${prefs.lightStartHour}:00`
          : '—',
    },
    {
      label: 'Climate targets',
      value:
        prefs.temperatureDay !== null && prefs.temperatureNight !== null
          ? `${prefs.temperatureDay}°C day / ${prefs.temperatureNight}°C night · humidity ${
              prefs.humidityTarget ?? '—'
            }%`
          : '—',
    },
    {
      label: 'Soil moisture alert',
      value: `${prefs.soilMoistureLowPct}% threshold`,
    },
    {
      label: 'Timelapse',
      value: `Daily @ ${formatHour(prefs.timelapseHour)}:00`,
    },
    {
      label: 'Notifications',
      value: formatNotifications(prefs.notifications),
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Review & confirm</h2>
        <p className="text-sm text-slate-500">
          Confirming will push the greenhouse defaults, flag setup as complete, and send you to the
          dashboard.
        </p>
      </div>
      <ListGroup className="rounded-2xl border border-slate-200 text-sm">
        {summary.map((item) => (
          <ListGroupItem
            key={item.label}
            className="flex flex-col gap-1 rounded-none border-0 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between last:border-b-0"
          >
            <span className="font-medium text-slate-500">{item.label}</span>
            <span className="text-base text-slate-900">{item.value}</span>
          </ListGroupItem>
        ))}
      </ListGroup>
    </section>
  );
};

const prettify = (value?: string) =>
  value
    ?.split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') ?? '';

const firstParagraph = (value?: string | null) =>
  value?.split('\n').map((part) => part.trim()).filter(Boolean).at(0) ?? null;

const formatNotifications = (settings: SetupWizardState['prefs']['notifications']) => {
  const parts: string[] = [];
  if (settings.email) parts.push('Email');
  if (settings.push) parts.push('Push');
  if (settings.immediate) parts.push('Immediate');
  if (settings.digestDaily) parts.push('Daily digest');
  return parts.length ? parts.join(' · ') : 'Disabled for now';
};

const formatHour = (value: number) => value.toString().padStart(2, '0');

export default StepReview;
