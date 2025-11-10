import { Alert, Button, Card, Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { GreenhouseFormFields } from '../greenhouse/components/GreenhouseFormFields';
import { getCurrentGreenhouse, updateCurrentGreenhouse } from '../greenhouse/api';
import type { GreenhouseConfig } from '../greenhouse/types';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(() => {
    setLoading(true);
    setError(null);
    setSaved(false);
    getCurrentGreenhouse()
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load greenhouse settings';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await updateCurrentGreenhouse(config);
      setConfig(updated);
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save greenhouse settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  let content: JSX.Element;
  if (loading) {
    content = (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  } else if (error && !config) {
    content = (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Alert color="failure">
          <span className="font-semibold">Unable to load settings.</span> {error}
        </Alert>
        <Button color="dark" onClick={fetchConfig}>
          Retry
        </Button>
      </div>
    );
  } else if (config) {
    content = (
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4">
          {error && (
            <Alert color="failure">
              <span className="font-semibold">Save failed.</span> {error}
            </Alert>
          )}
          {saved && <Alert color="success">Settings saved successfully.</Alert>}
          <GreenhouseFormFields
            value={config}
            onChange={(next) => setConfig(next)}
            disabled={saving}
          />
          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              Save changes
            </Button>
            <Button color="light" onClick={fetchConfig} disabled={saving}>
              Reset
            </Button>
          </div>
        </div>
      </Card>
    );
  } else {
    content = <></>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Greenhouse settings</h1>
        <p className="text-sm text-slate-500">
          Configure your greenhouse profile and daily timelapse capture window.
        </p>
      </div>
      {content}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Need to rerun the setup wizard?</h2>
            <p className="text-sm text-slate-500">
              Restarting clears the local wizard progress and takes you back to the onboarding flow.
            </p>
          </div>
          <Button color="light" onClick={() => navigate('/setup')}>
            Restart setup
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
