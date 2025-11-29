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
      icon: Icons.crop,
      value: defaults
        ? `${defaults.cropId} ▸ ${defaults.displayName ?? prettify(defaults.variety)}`
        : 'Choose a crop above',
    },
    {
      label: 'Overview',
      icon: Icons.overview,
      value: firstParagraph(defaults?.overview) ?? '—',
    },
    {
      label: 'Light schedule',
      icon: Icons.light,
      value:
        prefs.lightHours !== null
          ? `${prefs.lightHours} hrs · start ${formatHour(prefs.lightStartHour)}:00`
          : '—',
    },
    {
      label: 'Climate targets',
      icon: Icons.climate,
      value:
        prefs.temperatureDay !== null && prefs.temperatureNight !== null
          ? `${prefs.temperatureDay}°C day / ${prefs.temperatureNight}°C night · humidity ${
              prefs.humidityTarget ?? '—'
            }%`
          : '—',
    },
    {
      label: 'Soil moisture alert',
      icon: Icons.moisture,
      value: `${prefs.soilMoistureLowPct}% threshold`,
    },
    {
      label: 'Timelapse',
      icon: Icons.timelapse,
      value: `Daily @ ${formatHour(prefs.timelapseHour)}:00`,
    },
    {
      label: 'Notifications',
      icon: Icons.notifications,
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
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 shadow-inner">
        {summary.map((item, index) => (
          <div
            key={item.label}
            className={`border-b border-slate-700/60 px-4 py-3 text-sm last:border-b-0 ${
              index % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-emerald-300 ring-1 ring-emerald-400/30">
                {item.icon.color}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  {item.label}
                </div>
                <div className="text-base text-slate-50 sm:leading-6">{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
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

const Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden
    {...props}
  />
);

const Icons = {
  crop: {
    color: (
      <Icon className="text-emerald-300">
        <path d="M5 12c3-6 11-6 14 0" />
        <path d="M12 13c-2 0-4 3-4 5a4 4 0 0 0 8 0c0-2-2-5-4-5Z" />
        <path d="M12 13V6" />
      </Icon>
    ),
  },
  overview: {
    color: (
      <Icon className="text-sky-300">
        <path d="M7 4h7l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M14 4v3h3" />
        <path d="M8 10h8M8 14h5" />
      </Icon>
    ),
  },
  light: {
    color: (
      <Icon className="text-amber-300">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M4.22 4.22 5.64 5.64M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78 5.64 18.36M18.36 5.64l1.42-1.42" />
      </Icon>
    ),
  },
  climate: {
    color: (
      <Icon className="text-cyan-300">
        <path d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z" />
        <path d="M10 9h4" />
      </Icon>
    ),
  },
  moisture: {
    color: (
      <Icon className="text-indigo-300">
        <path d="M12 3s-4 5-4 8a4 4 0 1 0 8 0c0-3-4-8-4-8Z" />
      </Icon>
    ),
  },
  timelapse: {
    color: (
      <Icon className="text-lime-300">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 7v5l3 2" />
      </Icon>
    ),
  },
  notifications: {
    color: (
      <Icon className="text-pink-300">
        <path d="M5 18h14" />
        <path d="M6 18V9a6 6 0 0 1 12 0v9" />
        <path d="M9 18v1a3 3 0 0 0 6 0v-1" />
      </Icon>
    ),
  },
};

export default StepReview;
