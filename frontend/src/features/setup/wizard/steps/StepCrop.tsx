import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Badge, Button, Spinner } from 'flowbite-react';
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

const panelClass =
  'rounded-2xl border border-[#1f2a3d] bg-[#0f1729] px-4 py-3 text-sm text-slate-300';

type DropdownOption = {
  id: string;
  label: string;
  description?: string;
  emoji?: string;
  supported: boolean;
};

const ThemedDropdown = ({
  label,
  placeholder,
  value,
  options,
  disabled = false,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value?: string;
  options: DropdownOption[];
  disabled?: boolean;
  onSelect: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <div className="relative space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium outline-none transition ${
          open
            ? 'border-emerald-500 bg-[#0f1729] ring-2 ring-emerald-500/20'
            : 'border-[#22324a] bg-[#0f1729] hover:border-emerald-500/40'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'text-slate-100'}`}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              {selected.emoji ? <span>{selected.emoji}</span> : null}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>
        <span className={`shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && !disabled ? (
        <div
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#22324a] bg-slate-950 p-2 opacity-100 shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-black/40"
          style={{ backgroundColor: '#020617' }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={!option.supported}
              onClick={() => {
                if (!option.supported) return;
                onSelect(option.id);
                setOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2 text-left transition ${
                option.id === value
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : option.supported
                    ? 'text-slate-200 hover:bg-slate-800/80 hover:text-emerald-200'
                    : 'cursor-not-allowed text-slate-600 opacity-60'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    {option.emoji ? <span>{option.emoji}</span> : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {!option.supported ? (
                  <span className="shrink-0 rounded-full bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    soon
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selected?.description ? <p className="text-xs leading-5 text-slate-400">{selected.description}</p> : null}
    </div>
  );
};

const DetailSection = ({
  title,
  helper,
  children,
  defaultOpen = false,
}: {
  title: string;
  helper?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => (
  <details className="group rounded-2xl border border-[#1f2a3d] bg-[#0f1729]" open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-100 marker:hidden">
      <span>
        {title}
        {helper ? <span className="ml-2 font-normal text-slate-500">{helper}</span> : null}
      </span>
      <span className="text-xs font-medium text-slate-500 transition group-open:rotate-180">⌄</span>
    </summary>
    <div className="border-t border-[#1f2a3d] px-4 py-3">{children}</div>
  </details>
);

const MetricList = ({ items }: { items: Array<[string, string | undefined]> }) => (
  <dl className="grid gap-3 sm:grid-cols-2">
    {items.map(([label, value]) => (
      <div key={label} className="rounded-xl border border-[#22324a] bg-[#111c2d] px-3 py-2">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm text-slate-200">{value || '—'}</dd>
      </div>
    ))}
  </dl>
);

const StageList = ({ defaults }: { defaults: CropDefaults }) => {
  if (!defaults.stages.length) return null;

  return (
    <DetailSection title="Growth stages" helper={`${defaults.stages.length} stages`}>
      <div className="space-y-2">
        {defaults.stages.map((stage) => (
          <div key={stage.id} className="rounded-xl border border-[#22324a] bg-[#111c2d] px-3 py-2">
            <p className="font-medium text-slate-100">{stage.label ?? stage.id.replace(/-/g, ' ')}</p>
            {stage.cues && stage.cues.length > 0 ? (
              <p className="mt-1 text-xs leading-5 text-slate-400">{stage.cues[0]}</p>
            ) : null}
          </div>
        ))}
      </div>
    </DetailSection>
  );
};

export const StepCrop = ({ data, onChange }: StepProps) => {
  const [status, setStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const selection = data.selection;
  const selectedCropId = selection.cropId;
  const selectedVariety = selection.variety;
  const selectedCrop = useMemo(() => findCrop(selectedCropId), [selectedCropId]);
  const defaultsMatchSelection = Boolean(
    selection.defaults &&
      selection.defaults.cropId === selectedCropId &&
      selection.defaults.variety === selectedVariety,
  );

  useEffect(() => {
    const cropId = selectedCropId;
    const variety = selectedVariety;
    if (!cropId || !variety) {
      setStatus({ loading: false, error: null });
      return;
    }

    if (defaultsMatchSelection) {
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
  }, [defaultsMatchSelection, selectedCropId, selectedVariety, reloadToken, onChange]);

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

  const handleCropSelectChange = (value: string) => {
    const crop = findCrop(value);
    if (crop) handleSelectCrop(crop);
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

  const handleVarietySelectChange = (value: string) => {
    if (!selectedCrop) return;
    const variety = selectedCrop.varieties.find((option) => option.id === value);
    if (variety) handleSelectVariety(variety, selectedCrop);
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
        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">🌱 Choose your crop</h2>
              <p className="text-sm text-slate-400">
                Use the dropdowns to choose a crop and variety. Details stay collapsed until defaults load.
              </p>
            </div>
            {selectedCrop ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {selectedCrop.emoji} {selectedCrop.label}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ThemedDropdown
              label="Crop family"
              placeholder="Select a crop"
              value={selectedCropId}
              options={CROP_LIBRARY}
              onSelect={handleCropSelectChange}
            />

            <ThemedDropdown
              label="Variety"
              placeholder={selectedCrop ? 'Select a variety' : 'Choose a crop first'}
              value={selectedVariety}
              options={selectedCrop?.varieties ?? []}
              disabled={!selectedCrop}
              onSelect={handleVarietySelectChange}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">📋 Crop defaults</h3>
              <p className="text-sm text-slate-400">
                Loaded from the RAG/seed-pack data when the backend is available.
              </p>
            </div>
            {status.loading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Spinner size="sm" color="success" /> Loading
              </span>
            ) : null}
          </div>

          {status.error ? (
            <div className={`${panelClass} border-amber-500/30 bg-amber-950/20 text-amber-100`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Defaults are not available right now.</p>
                  <p className="mt-1 text-xs leading-5 text-amber-100/80">
                    The crop and variety are selected, but the local API did not return the RAG data.
                    Start the backend on the expected port, then retry.
                  </p>
                </div>
                <Button color="gray" outline={true} size="xs" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {!selection.variety && !status.error ? (
            <div className={panelClass}>Pick a supported variety above to preview its defaults.</div>
          ) : null}

          {showPreview && selection.defaults ? (
            <div className="space-y-4">
              <div className={panelClass}>
                <p className="text-sm font-semibold text-emerald-400">
                  {selection.defaults.displayName ?? selection.varietyLabel}
                </p>
                {overview ? <p className="mt-2 text-sm leading-6 text-slate-300">{overview}</p> : null}
                {safetyBadges.length ? <div className="mt-3 flex flex-wrap gap-2">{safetyBadges}</div> : null}
              </div>

              {environment ? (
                <DetailSection title="Environment" helper="temperature, humidity, light" defaultOpen={true}>
                  <MetricList
                    items={[
                      ['Day temp', environment.temperature_day],
                      ['Night temp', environment.temperature_night],
                      ['Humidity', environment.humidity],
                      ['Light hours', environment.light_hours],
                    ]}
                  />
                </DetailSection>
              ) : null}

              {irrigation ? (
                <DetailSection title="Irrigation" helper="method and cadence">
                  <MetricList
                    items={[
                      ['Method', irrigation.method],
                      ['Frequency', irrigation.frequency],
                      ['Notes', irrigation.notes],
                    ]}
                  />
                </DetailSection>
              ) : null}

              {container ? (
                <DetailSection title="Container" helper="size guidance">
                  <MetricList
                    items={[
                      ['Volume', container.volume_liters],
                      ['Diameter', container.diameter_cm],
                      ['Depth', container.depth_cm],
                    ]}
                  />
                </DetailSection>
              ) : null}

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
