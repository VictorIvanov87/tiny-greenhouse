import type { Dispatch, SetStateAction } from 'react';
import type { SetupWizardState } from '../../state';
import { CHECKLIST_ITEMS } from '../data/checklistItems';
import WizardLayout from '../WizardLayout';
import WizardAssist from '../WizardAssist';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
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
  crop: (
    <Icon className="text-emerald-300">
      <path d="M5 12c3-6 11-6 14 0" />
      <path d="M12 13c-2 0-4 3-4 5a4 4 0 0 0 8 0c0-2-2-5-4-5Z" />
      <path d="M12 13V6" />
    </Icon>
  ),
  overview: (
    <Icon className="text-sky-300">
      <path d="M7 4h7l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v3h3" />
      <path d="M8 10h8M8 14h5" />
    </Icon>
  ),
  light: (
    <Icon className="text-amber-300">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.22 4.22 5.64 5.64M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78 5.64 18.36M18.36 5.64l1.42-1.42" />
    </Icon>
  ),
  climate: (
    <Icon className="text-cyan-300">
      <path d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z" />
      <path d="M10 9h4" />
    </Icon>
  ),
  alarms: (
    <Icon className="text-pink-300">
      <path d="M5 18h14" />
      <path d="M6 18V9a6 6 0 0 1 12 0v9" />
      <path d="M9 18v1a3 3 0 0 0 6 0v-1" />
    </Icon>
  ),
  notifications: (
    <Icon className="text-indigo-300">
      <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10c0-.63.3-1.22.8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
      <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
    </Icon>
  ),
};

const StepFinish = ({ data, onChange }: StepProps) => {
  const defaults = data.selection.defaults;
  const prefs = data.prefs;
  const { alarmRules, checklist } = data;
  const selection = data.selection;

  const currentStageId = selection.stage ?? defaults?.defaultStage ?? defaults?.stages[0]?.id;
  const stageLabel =
    defaults?.stages.find((s) => s.id === currentStageId)?.label ?? currentStageId ?? null;

  const enabledAlarmCount = alarmRules.filter((r) => r.enabled).length;
  const checkedCount = CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  const totalChecklist = CHECKLIST_ITEMS.length;
  const progressPct = (checkedCount / totalChecklist) * 100;

  const toggleChecklist = (id: string) => {
    onChange((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [id]: !prev.checklist[id] },
    }));
  };

  const summary = [
    {
      label: 'Crop selection',
      icon: Icons.crop,
      value: defaults
        ? `${defaults.cropId} ▸ ${defaults.displayName ?? prettify(defaults.variety)}`
        : 'Not selected',
    },
    {
      label: 'Growth phase',
      icon: Icons.crop,
      value: stageLabel ?? '—',
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
          : 'Auto-configured',
    },
    {
      label: 'Climate targets',
      icon: Icons.climate,
      value:
        prefs.temperatureDay !== null && prefs.temperatureNight !== null
          ? `${prefs.temperatureDay}°C day / ${prefs.temperatureNight}°C night · humidity ${prefs.humidityTarget ?? '—'}%`
          : 'Auto-configured',
    },
    {
      label: 'Alarm rules',
      icon: Icons.alarms,
      value: `${enabledAlarmCount} active rule${enabledAlarmCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Notifications',
      icon: Icons.notifications,
      value: formatNotifications(prefs.notifications),
    },
  ];

  return (
    <WizardLayout
      aside={
        <WizardAssist
          cropId={selection.cropId}
          variety={selection.variety}
          stepContext="physical-setup"
          disabled={!selection.cropId || !selection.variety}
        />
      }
    >
      <div className="space-y-6">
        {/* Review table */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">📋 Review your setup</h2>
            <p className="text-sm text-slate-400">
              Everything looks good? Complete the checklist below to finish.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#1f2a3d]">
            {summary.map((item, index) => (
              <div
                key={item.label}
                className={`border-b border-[#1f2a3d]/60 px-4 py-3 text-sm last:border-b-0 ${
                  index % 2 === 0 ? 'bg-[#0f1729]/80' : 'bg-[#0f1729]/40'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#1a2740] ring-1 ring-emerald-400/20">
                    {item.icon}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {item.label}
                    </div>
                    <div className="text-sm text-slate-100 sm:leading-6">{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Physical setup checklist */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">✅ Physical Setup Checklist</h2>
            <p className="text-sm text-slate-400">
              Complete these steps to get your greenhouse up and running. All items must be checked to proceed.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-300">
                {checkedCount} of {totalChecklist} complete
              </span>
              {checkedCount === totalChecklist ? (
                <span className="text-emerald-400">🎉 All done!</span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#1f2a3d]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = Boolean(checklist[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleChecklist(item.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                    checked
                      ? 'border-emerald-500/30 bg-emerald-900/20'
                      : 'border-[#22324a] bg-[#0f1729] hover:border-emerald-500/20'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border transition ${
                      checked
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-[#22324a] bg-[#111c2d]'
                    }`}
                  >
                    {checked ? (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                  </div>
                  <span className="flex-shrink-0 text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${checked ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400">{item.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </WizardLayout>
  );
};

export default StepFinish;
