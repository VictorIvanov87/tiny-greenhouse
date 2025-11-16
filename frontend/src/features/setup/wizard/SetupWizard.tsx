import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Button, Card, Spinner } from 'flowbite-react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  getNextStep,
  getPreviousStep,
  isStepValid,
  SetupWizardProvider,
  useSetupWizard,
  type SetupWizardState,
  type WizardStep,
} from '../state';
import Stepper from './Stepper';
import StepWelcome from './steps/StepWelcome';
import StepCrop from './steps/StepCrop';
import StepPrefs from './steps/StepPrefs';
import StepReview from './steps/StepReview';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { saveUserSettings, updateGreenhouse } from '../api';
import type { GreenhouseConfig } from '../../greenhouse/types';

const TITLES = ['Welcome', 'Crop & Variety', 'Alarms & prefs', 'Finish'];

const StepContent = ({
  step,
  data,
  onChange,
}: {
  step: WizardStep;
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
}) => {
  switch (step) {
    case 0:
      return <StepWelcome data={data} />;
    case 1:
      return <StepCrop data={data} onChange={onChange} />;
    case 2:
      return <StepPrefs data={data} onChange={onChange} />;
    case 3:
    default:
      return <StepReview data={data} />;
  }
};

const WizardViewport = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useUserProfile(user ? user.uid : null);
  const { state, setState, reset } = useSetupWizard();
  const step = state.step ?? 0;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = isStepValid(state, step as WizardStep);
  const isLastStep = step === TITLES.length - 1;
  const stepLabel = useMemo(() => `Step ${step + 1} of ${TITLES.length}`, [step]);

  const handleNext = () => {
    if (!canProceed) {
      return;
    }
    setState((prev) => ({
      ...prev,
      step: getNextStep(prev.step ?? 0),
    }));
  };

  const handleBack = () => {
    setState((prev) => ({
      ...prev,
      step: getPreviousStep(prev.step ?? 0),
    }));
  };

  const handleCancel = () => {
    const confirmed = window.confirm('Cancel setup and head back to the dashboard? Progress clears.');
    if (!confirmed) {
      return;
    }
    reset();
    navigate('/dashboard', { replace: true });
  };

  const handleFinish = async () => {
    if (!user) {
      setError('You must be signed in to finish setup.');
      return;
    }

    if (!state.selection.cropId || !state.selection.variety || !state.selection.defaults) {
      setError('Choose a crop and variety before confirming.');
      return;
    }

    setSaving(true);
    setError(null);

    const defaults = state.selection.defaults;
    const greenhousePayload: GreenhouseConfig = {
      id: 'gh-1',
      name: 'Tiny Greenhouse #1',
      method: 'soil',
      plantType: state.selection.variety,
      cropId: state.selection.cropId,
      variety: state.selection.variety,
      growthStage: defaults.stages[0]?.id ?? 'germination',
      language: defaults.lang === 'bg' ? 'bg' : 'en',
      timelapse: { enabled: true, hour: 9 },
    };

    try {
      const updated = await updateGreenhouse(greenhousePayload);
      await saveUserSettings(user.uid, {
        cropId: state.selection.cropId,
        variety: state.selection.variety,
        language: greenhousePayload.language,
        notifications: state.prefs.notifications,
        greenhouseId: updated.id,
      });
      reset();
      refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish setup';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner color="success" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.setupCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 rounded-[32px] border border-white/10 bg-white/95 p-6 shadow-[0_35px_120px_rgba(15,23,42,0.45)] backdrop-blur">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
            Setup wizard
          </p>
          <Stepper current={step as WizardStep} titles={TITLES} />
        </header>
        <main className="flex-1">
          <Card className="h-full w-full border border-slate-200 shadow-none">
            <div className="space-y-6">
              {error ? <Alert color="failure">{error}</Alert> : null}
              <StepContent step={step as WizardStep} data={state} onChange={setState} />
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
                    <Button onClick={handleFinish} disabled={saving || !canProceed}>
                      {saving ? 'Finishing…' : 'Confirm'}
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

const SetupWizard = () => (
  <SetupWizardProvider>
    <WizardViewport />
  </SetupWizardProvider>
);

export default SetupWizard;
