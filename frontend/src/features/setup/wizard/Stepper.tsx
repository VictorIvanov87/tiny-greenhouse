import { Badge } from 'flowbite-react';
import type { WizardStep } from './state';

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
        const badgeColor = isComplete ? 'success' : isCurrent ? 'info' : 'gray';
        return (
          <li key={title} className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge color={badgeColor} size="sm" aria-current={isCurrent ? 'step' : undefined}>
                {index + 1}
              </Badge>
              <span className={isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                {title}
              </span>
            </div>
            {index < titles.length - 1 && (
              <div
                className={`hidden flex-1 rounded-full sm:block ${
                  isComplete ? 'bg-emerald-500/80' : 'bg-slate-200'
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
