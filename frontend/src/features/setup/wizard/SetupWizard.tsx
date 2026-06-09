import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Button, Spinner } from 'flowbite-react';
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
import StepAlarms from './steps/StepAlarms';
import StepFinish from './steps/StepFinish';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { saveUserSettings, updateGreenhouse, updateNotificationPrefs } from '../api';
import type { GreenhouseConfig } from '../../greenhouse/types';
import type { NotificationPrefs } from '../../notifications/api';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle';

const SETUP_TITLES = ['🌶️ Crop & Variety', '🔔 Alarms', '✅ Finish'];

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
      return <StepAlarms data={data} onChange={onChange} />;
    case 3:
    default:
      return <StepFinish data={data} onChange={onChange} />;
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
  const [notificationWarning, setNotificationWarning] = useState(false);

  const canProceed = isStepValid(state, step as WizardStep);
  const isWelcome = step === 0;
  const isLastStep = step === SETUP_TITLES.length;
  const stepLabel = useMemo(
    () => (isWelcome ? 'Welcome tour' : `Setup step ${step} of ${SETUP_TITLES.length}`),
    [isWelcome, step],
  );

  const handleNext = () => {
    if (!canProceed) return;
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
    const growthStage =
      state.selection.stage ?? defaults.defaultStage ?? defaults.stages[0]?.id ?? 'germination';
    const quietHoursPayload =
      state.prefs.quietHours?.start && state.prefs.quietHours?.end ? state.prefs.quietHours : null;
    const lightHours = state.prefs.lightHours ?? 12;
    const preferencesPayload = {
      light: {
        hours: lightHours,
        startHour: state.prefs.lightStartHour,
      },
      climate: {
        temperature: {
          day: state.prefs.temperatureDay ?? 24,
          night: state.prefs.temperatureNight ?? 18,
        },
        humidity: {
          target: state.prefs.humidityTarget ?? 55,
        },
      },
      soil: {
        moistureLowPct: state.prefs.soilMoistureLowPct,
      },
      timelapse: {
        enabled: true,
        hour: state.prefs.timelapseHour,
      },
      channels: {
        email: state.prefs.notifications.email,
        push: state.prefs.notifications.push,
        digestDaily: state.prefs.notifications.digestDaily,
        immediate: state.prefs.notifications.immediate,
      },
      digestHour: state.prefs.digestHour,
      quietHours: quietHoursPayload,
    };

    const notificationPrefsPayload: NotificationPrefs = {
      email: state.prefs.notifications.email,
      push: state.prefs.notifications.push,
      rules: state.alarmRules,
      immediate: state.prefs.notifications.immediate,
      digestDaily: state.prefs.notifications.digestDaily,
      digestHour: state.prefs.digestHour,
      quietHours: quietHoursPayload,
    };

    const greenhousePayload: GreenhouseConfig = {
      id: 'gh-1',
      name: 'Tiny Greenhouse #1',
      method: 'soil',
      plantType: state.selection.variety,
      cropId: state.selection.cropId,
      variety: state.selection.variety,
      growthStage,
      language: defaults.lang === 'bg' ? 'bg' : 'en',
      timelapse: {
        enabled: true,
        hour: 9,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Sofia',
      },
    };

    try {
      const updated = await updateGreenhouse(greenhousePayload);
      const notificationsSaved = await updateNotificationPrefs(notificationPrefsPayload);
      setNotificationWarning(!notificationsSaved);
      await saveUserSettings(user.uid, {
        cropId: state.selection.cropId,
        variety: state.selection.variety,
        language: greenhousePayload.language,
        notifications: state.prefs.notifications,
        greenhouseId: updated.id,
        growthStage,
        light: preferencesPayload.light,
        climate: preferencesPayload.climate,
        soil: preferencesPayload.soil,
        timelapse: {
          hour: preferencesPayload.timelapse.hour,
          enabled: preferencesPayload.timelapse.enabled,
        },
        digestHour: preferencesPayload.digestHour,
        quietHours: preferencesPayload.quietHours,
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950">
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-6 sm:py-12">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 sm:gap-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
            Setup wizard
          </p>
          {!isWelcome ? <Stepper current={(step - 1) as WizardStep} titles={SETUP_TITLES} /> : null}
        </header>
          <main className="flex-1">
            <div className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] p-6 shadow-[0_24px_60px_rgba(8,20,38,0.35)] sm:p-8">
              <div className="space-y-6">
                {error ? <Alert color="failure">{error}</Alert> : null}
                {notificationWarning ? (
                  <Alert color="warning">
                    Notifications not connected — preferences saved locally. You can retry later from
                    Settings.
                  </Alert>
                ) : null}
                <StepContent step={step as WizardStep} data={state} onChange={setState} />
                <footer className="flex flex-col gap-4 border-t border-[#1f2a3d] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-400">{stepLabel}</div>
                  <div className="flex flex-wrap gap-2">
                    {!isWelcome ? (
                      <Button color="gray" outline={true} onClick={handleBack} disabled={saving}>
                        Back
                      </Button>
                    ) : null}
                    {isWelcome ? (
                      <Button color="green" outline={true} onClick={handleNext} disabled={saving}>
                        Start setup
                      </Button>
                    ) : !isLastStep ? (
                      <Button color="green" outline={true} onClick={handleNext} disabled={!canProceed || saving}>
                        Next
                      </Button>
                    ) : (
                      <Button color="green" outline={true} onClick={handleFinish} disabled={saving || !canProceed}>
                        {saving ? 'Finishing…' : 'Confirm'}
                      </Button>
                    )}
                  </div>
                </footer>
              </div>
            </div>
          </main>
      </div>
    </div>
  );
};

const SetupWizard = () => {
  useDocumentTitle();
  return (
    <SetupWizardProvider>
      <WizardViewport />
    </SetupWizardProvider>
  );
};

export default SetupWizard;
