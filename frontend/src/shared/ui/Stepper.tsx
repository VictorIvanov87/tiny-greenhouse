type StepperStep = {
  id: string
  label: string
}

type StepperProps = {
  steps: StepperStep[]
  activeIndex: number
}

export const Stepper = ({ steps, activeIndex }: StepperProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-gray-500">
      {steps.map((step, index) => {
        const isActive = index === activeIndex
        const isCompleted = index < activeIndex

        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isActive || isCompleted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <span className={isActive ? 'text-emerald-600' : isCompleted ? 'text-gray-700' : ''}>{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className="hidden h-px w-10 bg-gray-300 sm:block" aria-hidden="true" />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
