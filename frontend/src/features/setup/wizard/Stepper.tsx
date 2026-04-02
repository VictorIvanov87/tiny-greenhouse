import type { WizardStep } from '../state';

type StepperProps = {
  current: WizardStep;
  titles: string[];
};

export const Stepper = ({ current, titles }: StepperProps) => {
  return (
    <ol className="flex w-full items-center gap-4" aria-label="Setup progress">
      {titles.map((title, index) => {
        const isCurrent = index === current;
        const isComplete = index < current;
        return (
          <li key={title} className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isComplete
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50'
                      : 'bg-[#1f2a3d] text-slate-500'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`hidden text-sm sm:inline ${
                  isCurrent
                    ? 'font-semibold text-slate-100'
                    : isComplete
                      ? 'text-slate-300'
                      : 'text-slate-500'
                }`}
              >
                {title}
              </span>
            </div>
            {index < titles.length - 1 && (
              <div
                className={`hidden flex-1 rounded-full sm:block ${
                  isComplete ? 'bg-emerald-500/60' : 'bg-[#1f2a3d]'
                } h-0.5`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
