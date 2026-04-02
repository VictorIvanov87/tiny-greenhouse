import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Badge, Button, Spinner } from 'flowbite-react';
import type { SetupWizardState, CropDefaults } from '../../state';
import { getCropDefaults } from '../../api';
import { ApiError } from '../../../../shared/hooks/useApi';
import { coerceNumber, parseHours } from '../../../../shared/utils/formatters';
import { CROP_LIBRARY, findCrop, findVariety, type CropOption, type VarietyOption } from '../data/cropLibrary';
import { generateDefaultAlarms } from '../data/defaultAlarms';
import WizardLayout from '../WizardLayout';
import WizardAssist from '../WizardAssist';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
};

const firstParagraph = (value?: string | null) =>
  value?.split('\n').map((part) => part.trim()).filter(Boolean).at(0) ?? null;

const StageList = ({ defaults }: { defaults: CropDefaults }) => {
  const [open, setOpen] = useState(false);

  if (!defaults.stages.length) return null;

  return (
    <div className="space-y-3">
      <Button
        color="gray"
        outline={true}
        className="flex w-full items-center justify-between !rounded-2xl"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Stages ({defaults.stages.length})</span>
        <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </Button>
      {open ? (
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#0f1729]">
          {defaults.stages.map((stage, idx) => (
            <div
              key={stage.id}
              className={`flex flex-col gap-1 px-4 py-3 text-sm ${
                idx < defaults.stages.length - 1 ? 'border-b border-[#1f2a3d]' : ''
              }`}
            >
              <span className="font-medium text-slate-100">
                {stage.label ?? stage.id.replace(/-/g, ' ')}
              </span>
              {stage.cues && stage.cues.length > 0 ? (
                <span className="text-xs text-slate-400">{stage.cues[0]}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const StepCrop = ({ data, onChange }: StepProps) => {
  const [status, setStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const selection = data.selection;

  useEffect(() => {
    const cropId = selection.cropId;
    const variety = selection.variety;
    if (!cropId || !variety) {
      setStatus({ loading: false, error: null });
      return;
    }

    if (
      selection.defaults &&
      selection.defaults.cropId === cropId &&
      selection.defaults.variety === variety
    ) {
      return;
    }

    let cancelled = false;
    setStatus({ loading: true, error: null });

    getCropDefaults(cropId, variety)
      .then((payload) => {
        if (cancelled) return;
        onChange((prev) => ({
          ...prev,
          selection: {
            cropId,
            cropLabel: findCrop(cropId)?.label ?? cropId,
            variety,
            varietyLabel: findVariety(cropId, variety)?.label ?? variety,
            defaults: payload,
          },
          prefs: seedPrefsFromDefaults(prev.prefs, payload),
          alarmRules: generateDefaultAlarms(payload),
        }));
        setStatus({ loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError && error.status === 404
            ? 'The selected variety has no dataset yet.'
            : 'Failed to load crop defaults.';
        setStatus({ loading: false, error: message });
        onChange((prev) => ({
          ...prev,
          selection: { ...prev.selection, defaults: undefined },
        }));
      });

    return () => { cancelled = true; };
  }, [selection.cropId, selection.variety, reloadToken, onChange]);

  const overview = firstParagraph(selection.defaults?.overview);
  const environment = selection.defaults?.defaults?.environment;
  const irrigation = selection.defaults?.defaults?.irrigation;
  const container = selection.defaults?.defaults?.container;
  const safety = selection.defaults?.safety_bounds;
  const showPreview = Boolean(selection.defaults) && !status.loading;

  const handleSelectCrop = (option: CropOption) => {
    if (!option.supported) return;
    setStatus((prev) => ({ ...prev, error: null }));
    onChange((prev) => {
      const keepVariety = option.varieties.some(
        (v) => v.id === prev.selection.variety && v.supported,
      );
      return {
        ...prev,
        selection: {
          cropId: option.id,
          cropLabel: option.label,
          variety: keepVariety ? prev.selection.variety : undefined,
          varietyLabel: keepVariety ? prev.selection.varietyLabel : undefined,
          defaults: keepVariety ? prev.selection.defaults : undefined,
        },
      };
    });
  };

  const handleSelectVariety = (option: VarietyOption, parent: CropOption) => {
    if (!option.supported || !parent.supported) return;
    setStatus((prev) => ({ ...prev, error: null }));
    onChange((prev) => ({
      ...prev,
      selection: {
        cropId: parent.id,
        cropLabel: parent.label,
        variety: option.id,
        varietyLabel: option.label,
        defaults:
          prev.selection.defaults &&
          prev.selection.defaults.cropId === parent.id &&
          prev.selection.defaults.variety === option.id
            ? prev.selection.defaults
            : undefined,
      },
    }));
  };

  const formatBounds = (label: string, metric?: { min?: number; max?: number }) => {
    if (!metric || typeof metric.min !== 'number' || typeof metric.max !== 'number') return null;
    return (
      <Badge key={label} color="gray" className="text-xs">
        {label}: {metric.min}–{metric.max}
      </Badge>
    );
  };

  const safetyBadges = useMemo(
    () =>
      [
        formatBounds('Temp °C', safety?.temperature_c),
        formatBounds('Humidity %', safety?.humidity_pct),
        formatBounds('Light hrs', safety?.light_hours),
      ].filter(Boolean),
    [safety],
  );

  const handleRetry = () => setReloadToken((t) => t + 1);

  return (
    <WizardLayout
      aside={
        <WizardAssist
          cropId={selection.cropId}
          variety={selection.variety}
          stepContext="crop-selection"
          disabled={!selection.cropId || !selection.variety}
        />
      }
    >
      <div className="space-y-6">
        {/* Crop selector */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">🌱 Choose your crop</h2>
            <p className="text-sm text-slate-400">
              Pick a crop family and variety to load smart defaults.
            </p>
          </div>
          <div className="space-y-3">
            {CROP_LIBRARY.map((crop) => {
              const isActive = selection.cropId === crop.id;
              return (
                <div
                  key={crop.id}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-900/20'
                      : crop.supported
                        ? 'border-[#22324a] bg-[#0f1729] hover:border-emerald-500/30'
                        : 'border-[#22324a] bg-[#0f1729] opacity-50'
                  }`}
                  onClick={() => handleSelectCrop(crop)}
                  role="button"
                  tabIndex={crop.supported ? 0 : -1}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectCrop(crop); }}
                >
                  <div className="flex items-center gap-3">
                    {crop.imageUrl ? (
                      <img
                        src={crop.imageUrl}
                        alt={crop.label}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a2740] text-2xl">
                        {crop.emoji}
                      </span>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{crop.label}</span>
                        {!crop.supported ? (
                          <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                            coming soon
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-400">{crop.description}</p>
                    </div>
                  </div>

                  {isActive && crop.supported ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {crop.varieties.map((variety) => {
                        const isSelected = selection.variety === variety.id;
                        return (
                          <button
                            key={variety.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectVariety(variety, crop); }}
                            disabled={!variety.supported}
                            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                              isSelected
                                ? 'border border-emerald-500 bg-emerald-600/20 text-emerald-300'
                                : variety.supported
                                  ? 'border border-[#22324a] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
                                  : 'border border-[#22324a] text-slate-500 opacity-50'
                            }`}
                          >
                            {variety.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Crop defaults preview */}
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">📋 Crop defaults</h3>
              <p className="text-sm text-slate-400">
                Smart defaults loaded from the seed pack database.
              </p>
            </div>
            {status.loading ? <Spinner size="sm" color="success" /> : null}
          </div>

          {status.error ? (
            <Alert color="failure" className="text-sm">
              <div className="flex flex-col gap-2">
                <span>{status.error}</span>
                <Button color="gray" outline={true} size="xs" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </Alert>
          ) : null}

          {!selection.variety ? (
            <p className="text-sm text-slate-400">
              Pick a supported variety above to see its defaults.
            </p>
          ) : null}

          {showPreview && selection.defaults ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-400">
                  {selection.defaults.displayName ?? selection.varietyLabel}
                </p>
                {overview ? <p className="text-sm text-slate-300">{overview}</p> : null}
              </div>

              {safetyBadges.length ? (
                <div className="flex flex-wrap gap-2">{safetyBadges}</div>
              ) : null}

              <div className="rounded-xl border border-[#1f2a3d] bg-[#0f1729]">
                {environment ? (
                  <div className="flex flex-col gap-1 border-b border-[#1f2a3d] px-4 py-3 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Environment
                    </span>
                    <span className="text-slate-200">Day temp: {environment.temperature_day ?? '—'}</span>
                    <span className="text-slate-200">Night temp: {environment.temperature_night ?? '—'}</span>
                    <span className="text-slate-200">Humidity: {environment.humidity ?? '—'}</span>
                    <span className="text-slate-200">Light hours: {environment.light_hours ?? '—'}</span>
                  </div>
                ) : null}
                {irrigation ? (
                  <div className="flex flex-col gap-1 border-b border-[#1f2a3d] px-4 py-3 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Irrigation
                    </span>
                    <span className="text-slate-200">Method: {irrigation.method ?? '—'}</span>
                    <span className="text-slate-200">Frequency: {irrigation.frequency ?? '—'}</span>
                    {irrigation.notes ? <span className="text-slate-400">{irrigation.notes}</span> : null}
                  </div>
                ) : null}
                {container ? (
                  <div className="flex flex-col gap-1 px-4 py-3 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Container
                    </span>
                    <span className="text-slate-200">Volume: {container.volume_liters ?? '—'}</span>
                    <span className="text-slate-200">Diameter: {container.diameter_cm ?? '—'}</span>
                    <span className="text-slate-200">Depth: {container.depth_cm ?? '—'}</span>
                  </div>
                ) : null}
              </div>

              <StageList defaults={selection.defaults} />
            </div>
          ) : null}
        </div>
      </div>
    </WizardLayout>
  );
};

const seedPrefsFromDefaults = (
  prefs: SetupWizardState['prefs'],
  defaults: CropDefaults,
): SetupWizardState['prefs'] => {
  const environment = defaults.defaults?.environment;
  const safety = defaults.safety_bounds;

  return {
    ...prefs,
    lightHours: parseHours(environment?.light_hours) ?? prefs.lightHours ?? 12,
    temperatureDay:
      coerceNumber(environment?.temperature_day) ??
      prefs.temperatureDay ??
      safety?.temperature_c?.max ??
      26,
    temperatureNight: coerceNumber(environment?.temperature_night) ?? prefs.temperatureNight ?? 18,
    humidityTarget: coerceNumber(environment?.humidity) ?? prefs.humidityTarget ?? 55,
    notifications: prefs.notifications,
  };
};

export default StepCrop;
