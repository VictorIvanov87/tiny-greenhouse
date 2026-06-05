import type { SetupWizardState } from '../../state';

type StepProps = {
  data: SetupWizardState;
};

const TOUR_ITEMS = [
  {
    emoji: '🌶️',
    label: 'Step 1 - choose your crop',
    subtitle: 'Pick a crop and variety so Tiny Greenhouse can load practical defaults.',
  },
  {
    emoji: '🌡️',
    label: 'Step 2 - review your defaults',
    subtitle: 'Check the suggested temperature, humidity, light, and soil ranges.',
  },
  {
    emoji: '🔔',
    label: 'Step 3 - tune your alarms',
    subtitle: 'Enable the alerts you want and skip the noisy ones.',
  },
  {
    emoji: '✅',
    label: 'Step 4 - confirm your checklist',
    subtitle: 'Do one final physical setup pass, then open the dashboard.',
  },
];

const StepWelcome = ({ data }: StepProps) => {
  const hasProgress = Boolean(
    data.selection.cropId ||
      data.selection.variety ||
      typeof data.prefs.lightHours === 'number' ||
      data.step > 0,
  );

  return (
    <section className="space-y-8">
      <div className="mx-auto max-w-5xl text-center">
        <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-5xl ring-1 ring-emerald-400/20">
          🌿
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400">
          Welcome tour
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Let’s set up your tiny greenhouse
        </h1>
        <p className="mx-auto mt-4 max-w-4xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
          This is a quick preview of what happens next. The actual setup starts after this screen:
          choose your crop, review smart defaults, enable useful alarms, and confirm your physical
          checklist before the dashboard goes live.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
            Usually 2–3 minutes
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
            You can adjust everything later
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row lg:gap-4">
        {TOUR_ITEMS.map((item) => (
          <article
            key={item.label}
            className="group flex min-w-0 flex-1 flex-col rounded-2xl border border-[#1f2a3d] bg-slate-950/35 p-4 shadow-[0_18px_42px_rgba(8,20,38,0.22)] transition hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-slate-950/50 lg:p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-2 lg:gap-3">
              <h3 className="pt-1 text-sm font-semibold leading-5 text-slate-100 lg:text-base lg:leading-6">
                {item.label}
              </h3>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1f2a3d] text-xl ring-1 ring-white/5 lg:h-11 lg:w-11 lg:text-2xl">
                {item.emoji}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-400">{item.subtitle}</p>
          </article>
        ))}
      </div>

      {hasProgress ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-center text-sm text-emerald-200">
          🔄 We restored your previous setup progress automatically. Continue whenever you’re ready.
        </div>
      ) : null}
    </section>
  );
};

export default StepWelcome;
