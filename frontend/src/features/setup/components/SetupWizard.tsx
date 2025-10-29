import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Label } from 'flowbite-react'
import { Stepper } from '../../../shared/ui/Stepper'
import { completeSetup } from '../api'
import {
  defaultWizardData,
  languageOptions,
  plantTypeOptions,
  type LanguageOption,
  type NotificationSettings,
  type PlantTypeOption,
  type SetupWizardData,
} from '../state'

const steps = [
  { id: 'language', label: 'Language', description: 'Choose your interface language.' },
  { id: 'plant', label: 'Plant Type', description: 'Tell us what you are growing.' },
  { id: 'notifications', label: 'Notifications', description: 'Decide how we keep you informed.' },
  { id: 'review', label: 'Review', description: 'Confirm and finish setup.' },
]

type SetupWizardProps = {
  uid: string
  initialData?: Partial<SetupWizardData>
  onCompleted: () => void
}

const normalizeData = (data?: Partial<SetupWizardData>): SetupWizardData => ({
  language: data?.language ?? defaultWizardData.language,
  plantType: data?.plantType ?? defaultWizardData.plantType,
  notifications: {
    email: data?.notifications?.email ?? defaultWizardData.notifications.email,
    push: data?.notifications?.push ?? defaultWizardData.notifications.push,
  },
})

export const SetupWizard = ({ uid, initialData, onCompleted }: SetupWizardProps) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [formData, setFormData] = useState<SetupWizardData>(() => normalizeData(initialData))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormData(normalizeData(initialData))
  }, [initialData])

  const currentStep = useMemo(() => steps[stepIndex], [stepIndex])

  const canContinue = useMemo(() => {
    if (stepIndex === 0) {
      return Boolean(formData.language)
    }

    if (stepIndex === 1) {
      return Boolean(formData.plantType)
    }

    return true
  }, [formData.language, formData.plantType, stepIndex])

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1)
      setError(null)
    }
  }

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex((index) => index - 1)
      setError(null)
    }
  }

  const handleLanguageChange = (language: LanguageOption) => {
    setFormData((prev) => ({
      ...prev,
      language,
    }))
    setError(null)
  }

  const handlePlantTypeChange = (plantType: PlantTypeOption) => {
    setFormData((prev) => ({
      ...prev,
      plantType,
    }))
    setError(null)
  }

  const handleNotificationChange = (field: keyof NotificationSettings) => (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: checked,
      },
    }))
  }

  const handleFinish = async () => {
    if (!formData.language || !formData.plantType) {
      setError('Please choose language and plant type before finishing.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await completeSetup(uid, {
        language: formData.language,
        plantType: formData.plantType,
        notifications: formData.notifications,
      })
      onCompleted()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save setup. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderLanguageStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Pick your preferred language for the dashboard.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {languageOptions.map((option) => {
          const isSelected = formData.language === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleLanguageChange(option.value)}
              className={`rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_10px_25px_rgba(16,118,82,0.18)]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:shadow-md'
              }`}
            >
              <span className="text-base font-semibold">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderPlantStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Select the crop you are focusing on so we can tune recommendations.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {plantTypeOptions.map((option) => {
          const isSelected = formData.plantType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePlantTypeChange(option.value)}
              className={`rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_12px_30px_rgba(16,118,82,0.18)]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:shadow-md'
              }`}
            >
              <span className="text-base font-semibold">{option.label}</span>
              <p className="mt-1 text-sm text-gray-500">{option.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderNotificationsStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choose how you would like to receive status updates and early alerts from your greenhouse.
      </p>
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <Label className="flex items-center gap-3 text-base font-medium text-gray-700">
          <Checkbox
            checked={formData.notifications.email}
            onChange={(event) => handleNotificationChange('email')(event.target.checked)}
          />
          Email summaries
        </Label>
        <p className="-mt-2 pl-8 text-sm text-gray-500">Weekly digest with trends and recommended actions.</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <Label className="flex items-center gap-3 text-base font-medium text-gray-700">
          <Checkbox
            checked={formData.notifications.push}
            onChange={(event) => handleNotificationChange('push')(event.target.checked)}
          />
          Push notifications
        </Label>
        <p className="-mt-2 pl-8 text-sm text-gray-500">Real-time alerts on your device when thresholds are crossed.</p>
      </div>
    </div>
  )

  const renderReviewStep = () => {
    if (!formData.language || !formData.plantType) {
      return (
        <p className="text-sm text-amber-600">
          Make sure you have selected a language and plant type before completing the setup.
        </p>
      )
    }

    const notificationSummary =
      formData.notifications.email && formData.notifications.push
        ? 'Email & push'
        : formData.notifications.email
          ? 'Email only'
          : formData.notifications.push
            ? 'Push only'
            : 'Notifications disabled'

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Review your choices and confirm to finish the setup.</p>
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-800">Language</span>
            <span className="capitalize">{formData.language}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-800">Plant type</span>
            <span className="capitalize">{formData.plantType.replace(/-/g, ' ')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-800">Notifications</span>
            <span>{notificationSummary}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    if (currentStep.id === 'language') {
      return renderLanguageStep()
    }

    if (currentStep.id === 'plant') {
      return renderPlantStep()
    }

    if (currentStep.id === 'notifications') {
      return renderNotificationsStep()
    }

    return renderReviewStep()
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <Stepper steps={steps} activeIndex={stepIndex} />
      <Card className="rounded-3xl border border-emerald-100 shadow-xl">
        <div className="space-y-6">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">{steps[stepIndex].label}</h1>
            <p className="text-sm text-gray-500">{steps[stepIndex].description}</p>
          </header>
          <section>{renderCurrentStep()}</section>
          {error ? (
            <Alert color="failure" className="border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </Alert>
          ) : null}
          <footer className="flex items-center justify-between">
            <Button color="light" onClick={goBack} disabled={stepIndex === 0 || submitting}>
              Back
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button onClick={goNext} disabled={!canContinue || submitting} color="success">
                Next
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={submitting || !canContinue} color="success">
                {submitting ? 'Finishing...' : 'Finish setup'}
              </Button>
            )}
          </footer>
        </div>
      </Card>
    </div>
  )
}
