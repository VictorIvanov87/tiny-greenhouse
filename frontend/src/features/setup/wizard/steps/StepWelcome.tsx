import type { SetupWizardState } from '../../state';

type StepProps = {
  data: SetupWizardState;
};

const StepWelcome = ({ data }: StepProps) => {
  const hasProgress = Boolean(
    data.selection.cropId ||
      data.selection.variety ||
      typeof data.prefs.lightHours === 'number' ||
      data.step > 0,
  );
  return (
    <section className="space-y-4">
      <div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Guided setup
        </span>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
          Let’s get your greenhouse ready
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Four quick steps to lock in crop preferences, alarm defaults, and final confirmation
          before hopping into the dashboard.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[
          'Persist progress locally so you can pick up at any time.',
          'All inputs are placeholders for now—focus on the flow.',
          'Next stays disabled until the current step is complete.',
          'Finish will redirect you back to the dashboard.',
        ].map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            {item}
          </li>
        ))}
      </ul>
      {hasProgress && (
        <p className="text-sm text-emerald-600">
          Looks like you already selected a few things earlier — everything was restored from
          localStorage.
        </p>
      )}
    </section>
  );
};

export default StepWelcome;
