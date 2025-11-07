import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { alpha, palette } from '../../theme/palette';
import { useAuth } from '../auth/hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { getCurrentGreenhouse, updateCurrentGreenhouse } from '../greenhouse/api';
import type { GreenhouseConfig } from '../greenhouse/types';
import { GreenhouseFormFields } from '../greenhouse/components/GreenhouseFormFields';
import { markSetupCompleted } from './api';

const SetupPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useUserProfile(user ? user.uid : null);
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(() => {
    if (!user) {
      return;
    }

    setConfigLoading(true);
    setLoadError(null);
    getCurrentGreenhouse()
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load greenhouse configuration';
        setLoadError(message);
      })
      .finally(() => {
        setConfigLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [fetchConfig, user]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-night)] text-[color:var(--color-sage)]">
        <span className="text-sm opacity-80">Loading setup wizard...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.setupCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSave = async () => {
    if (!config || !user) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateCurrentGreenhouse(config);
      await markSetupCompleted(user.uid);
      refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const backgroundStyle = [
    `radial-gradient(circle at 12% 18%, ${alpha(palette.sunlight, 0.2)} 0%, transparent 55%)`,
    `radial-gradient(circle at 80% 8%, ${alpha(palette.moss, 0.18)} 0%, transparent 60%)`,
    `linear-gradient(135deg, ${palette.night} 0%, ${alpha(palette.soil, 0.5)} 65%, ${
      palette.soil
    } 100%)`,
  ].join(', ');

  const renderForm = () => {
    if (configLoading) {
      return (
        <Card className="w-full rounded-3xl border border-white/20 bg-white/10 text-center shadow-[0_28px_80px_rgba(8,16,12,0.28)] backdrop-blur">
          <div className="flex min-h-[200px] items-center justify-center">
            <Spinner size="xl" />
          </div>
        </Card>
      );
    }

    if (loadError || !config) {
      return (
        <Card className="w-full space-y-4 rounded-3xl border border-white/20 bg-white/10 text-left shadow-[0_28px_80px_rgba(8,16,12,0.28)] backdrop-blur">
          <Alert color="failure">
            <span className="font-semibold">Unable to load configuration.</span> {loadError}
          </Alert>
          <Button color="light" onClick={fetchConfig}>
            Retry
          </Button>
        </Card>
      );
    }

    return (
      <Card className="w-full rounded-3xl border border-white/20 bg-white/10 text-left shadow-[0_28px_80px_rgba(8,16,12,0.28)] backdrop-blur">
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--color-soil-60)]">
            Confirm your greenhouse details so we can personalize alerts and automations.
          </p>
          {saveError && (
            <Alert color="failure">
              <span className="font-semibold">Save failed.</span> {saveError}
            </Alert>
          )}
          <GreenhouseFormFields
            value={config}
            onChange={(next) => setConfig(next)}
            disabled={saving}
          />
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="border-none bg-gradient-to-r from-emerald-500 to-lime-500 text-white"
            >
              Save and continue
            </Button>
            <Button color="light" onClick={fetchConfig} disabled={saving}>
              Reset
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10"
      style={{ background: backgroundStyle }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div
          className="absolute -left-20 top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: alpha(palette.evergreen, 0.2) }}
        />
        <div
          className="absolute bottom-10 right-0 h-64 w-64 rounded-full blur-3xl"
          style={{ background: alpha(palette.sunlight, 0.25) }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 text-center text-[color:var(--color-sage)]">
        <Card className="w-full rounded-3xl border border-white/20 bg-white/10 text-left shadow-[0_28px_80px_rgba(8,16,12,0.28)] backdrop-blur">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              First-time setup
            </span>
            <h1 className="text-3xl font-semibold text-[color:var(--color-evergreen)] sm:text-4xl">
              Let’s tune Tiny Greenhouse for your crops
            </h1>
            <p className="text-sm text-[color:var(--color-soil-60)] sm:text-base">
              We’ll ask a few quick questions to shape insights and alerts around your greenhouse
              goals.
            </p>
          </div>
        </Card>

        {renderForm()}
      </div>
    </div>
  );
};

export default SetupPage;
