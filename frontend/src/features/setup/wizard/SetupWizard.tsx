import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Button, Card } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';
import {
  getNextStep,
  getPreviousStep,
  hydrate,
  isStepValid,
  markSetupComplete,
  reset,
  save,
  type SetupData,
  type WizardStep,
} from './state';
import Stepper from './Stepper';
import StepWelcome from './steps/StepWelcome';
import StepCrop from './steps/StepCrop';
import StepPrefs from './steps/StepPrefs';
import StepReview from './steps/StepReview';
import { updateCurrentGreenhouse } from '../../greenhouse/api';
import type { GreenhouseConfig } from '../../greenhouse/types';

const TITLES = ['Welcome', 'Choose crop', 'Alarms & settings', 'Review'];

const StepContent = ({
  step,
  data,
  onChange,
}: {
  step: WizardStep;
  data: SetupData;
  onChange: Dispatch<SetStateAction<SetupData>>;
}) => {
  switch (step) {
    case 0:
      return <StepWelcome data={data} onChange={onChange} />;
    case 1:
      return <StepCrop data={data} onChange={onChange} />;
    case 2:
      return <StepPrefs data={data} onChange={onChange} />;
    case 3:
    default:
      return <StepReview data={data} />;
  }
};

const SetupWizard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SetupData>(() => hydrate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = data.step ?? 0;
  const canProceed = isStepValid(data, step);
  const isLastStep = step === TITLES.length - 1;

  useEffect(() => {
    save(data);
  }, [data]);

  const stepLabel = useMemo(() => `Step ${step + 1} of ${TITLES.length}`, [step]);

  const handleNext = () => {
    if (!canProceed) {
      return;
    }

    setData((prev) => ({
      ...prev,
      step: getNextStep(prev.step ?? 0),
    }));
  };

  const handleBack = () => {
    setData((prev) => ({
      ...prev,
      step: getPreviousStep(prev.step ?? 0),
    }));
  };

  const handleCancel = () => {
    const confirmed = window.confirm('Cancel setup and head back to the dashboard? Progress will be cleared.');
    if (!confirmed) {
      return;
    }

    reset();
    navigate('/dashboard', { replace: true });
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    const payload: GreenhouseConfig = {
      id: 'placeholder',
      name: 'Tiny Greenhouse',
      method: data.prefs.method ?? 'soil',
      plantType: data.crop.kind ?? 'chillies',
      language: data.prefs.language ?? 'en',
      timelapse: {
        enabled: true,
        hour: data.prefs.timelapseHour ?? 9,
      },
    };

    try {
      await updateCurrentGreenhouse(payload);
      markSetupComplete();
      reset();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish setup';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 rounded-[32px] border border-white/10 bg-white/95 p-6 shadow-[0_35px_120px_rgba(15,23,42,0.45)] backdrop-blur">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">Setup wizard</p>
          <Stepper current={step} titles={TITLES} />
        </header>
        <main className="flex-1">
          <Card className="h-full w-full border border-slate-200 shadow-none">
            <div className="space-y-6">
              {error && <Alert color="failure">{error}</Alert>}
              <StepContent step={step} data={data} onChange={setData} />
              <footer className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">{stepLabel}</div>
                <div className="flex flex-wrap gap-2">
                  <Button color="light" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button color="light" onClick={handleBack} disabled={step === 0 || saving}>
                    Back
                  </Button>
                  {!isLastStep ? (
                    <Button onClick={handleNext} disabled={!canProceed || saving}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleFinish} disabled={saving}>
                      {saving ? 'Finishing…' : 'Finish'}
                    </Button>
                  )}
                </div>
              </footer>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default SetupWizard;
