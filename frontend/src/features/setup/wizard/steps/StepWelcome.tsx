import type { SetupWizardState } from '../../state';

type StepProps = {
  data: SetupWizardState;
};

const FEATURES = [
  {
    emoji: '🌶️',
    title: 'Choose your crop',
    subtitle: 'Pick from our supported crop library and we\'ll load smart defaults.',
  },
  {
    emoji: '🔔',
    title: 'Set up smart alarms',
    subtitle: 'Automatic alerts based on your plant\'s safety bounds.',
  },
  {
    emoji: '✅',
    title: 'Physical setup checklist',
    subtitle: 'We\'ll walk you through planting step by step.',
  },
  {
    emoji: '🚀',
    title: 'Launch your dashboard',
    subtitle: 'Real-time monitoring starts immediately after setup.',
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
      <div className="text-center">
        <span className="mb-4 inline-block text-5xl">🌿</span>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Welcome to Tiny Greenhouse!
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-slate-400">
          Four quick steps to pick your crop, set up alarms, prepare your greenhouse,
          and launch your live dashboard. Let's grow something awesome!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5 transition hover:border-emerald-500/30"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{feature.emoji}</span>
              <span className="rounded-full bg-emerald-900/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                Step {index + 1}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{feature.subtitle}</p>
          </div>
        ))}
      </div>

      {hasProgress ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-center text-sm text-emerald-300">
          🔄 Looks like you have progress from a previous session — everything was restored automatically!
        </div>
      ) : null}
    </section>
  );
};

export default StepWelcome;
