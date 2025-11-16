import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Badge, Button, Card, ListGroup, ListGroupItem, Spinner } from 'flowbite-react';
import type { SetupWizardState, CropDefaults } from '../../state';
import { getCropDefaults } from '../../api';
import { MiniAssist } from '../../../assistant/MiniAssist';
import { ApiError } from '../../../../shared/hooks/useApi';
import { coerceNumber, parseHours } from '../../../../shared/utils/formatters';

type StepProps = {
  data: SetupWizardState;
  onChange: Dispatch<SetStateAction<SetupWizardState>>;
};

type VarietyOption = {
  id: string;
  label: string;
  description: string;
  supported: boolean;
};

type CropOption = {
  id: string;
  label: string;
  description: string;
  supported: boolean;
  varieties: VarietyOption[];
};

const CROP_LIBRARY: CropOption[] = [
  {
    id: 'chillies',
    label: 'Chillies',
    description: 'Compact heat lovers suited for balconies or small rigs.',
    supported: true,
    varieties: [
      {
        id: 'basket-of-fire',
        label: 'Basket of Fire',
        description: 'Trailing compact plants bred for baskets.',
        supported: true,
      },
      {
        id: 'prairie-fire',
        label: 'Prairie Fire',
        description: 'Windowsill ornamental with multi-color pods.',
        supported: true,
      },
    ],
  },
  {
    id: 'basil',
    label: 'Basil',
    description: 'Leafy herbs that prefer even moisture and pruning.',
    supported: true,
    varieties: [
      {
        id: 'genovese',
        label: 'Genovese',
        description: 'Classic sweet basil—tender leaves and fast rebounds.',
        supported: true,
      },
    ],
  },
  {
    id: 'mushrooms',
    label: 'Mushrooms',
    description: 'Humidity-forward fruiting blocks (coming soon).',
    supported: false,
    varieties: [
      { id: 'oyster', label: 'Oyster', description: 'Fruiting blocks', supported: false },
      { id: 'shiitake', label: 'Shiitake', description: 'Logs & blocks', supported: false },
    ],
  },
];

const findCrop = (cropId?: string) => CROP_LIBRARY.find((crop) => crop.id === cropId);
const findVariety = (cropId?: string, varietyId?: string) =>
  findCrop(cropId)?.varieties.find((variety) => variety.id === varietyId);

const firstParagraph = (value?: string | null) =>
  value?.split('\n').map((part) => part.trim()).filter(Boolean).at(0) ?? null;

const StageList = ({ defaults }: { defaults: CropDefaults }) => {
  const [open, setOpen] = useState(false);

  if (!defaults.stages.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200"
      >
        <span>Stages ({defaults.stages.length})</span>
        <span className="text-xs text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <ListGroup className="rounded-2xl border border-slate-200">
          {defaults.stages.map((stage) => (
            <ListGroupItem
              key={stage.id}
              className="flex flex-col gap-1 rounded-none border-0 border-b border-slate-100 text-sm last:border-b-0"
            >
              <span className="font-medium text-slate-900">
                {stage.label ?? stage.id.replace(/-/g, ' ')}
              </span>
              {stage.cues && stage.cues.length > 0 ? (
                <span className="text-xs text-slate-500">{stage.cues[0]}</span>
              ) : null}
            </ListGroupItem>
          ))}
        </ListGroup>
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
        if (cancelled) {
          return;
        }
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
        }));
        setStatus({ loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof ApiError && error.status === 404
            ? 'The selected variety has no dataset yet.'
            : 'Failed to load crop defaults.';
        setStatus({ loading: false, error: message });
        onChange((prev) => ({
          ...prev,
          selection: {
            ...prev.selection,
            defaults: undefined,
          },
        }));
      });

    return () => {
      cancelled = true;
    };
    // Including reloadToken gives us a manual retry knob without mutating selection
  }, [selection.cropId, selection.variety, reloadToken, onChange]);

  const overview = firstParagraph(selection.defaults?.overview);
  const environment = selection.defaults?.defaults?.environment;
  const irrigation = selection.defaults?.defaults?.irrigation;
  const container = selection.defaults?.defaults?.container;
  const safety = selection.defaults?.safety_bounds;

  const showPreview = Boolean(selection.defaults) && !status.loading;

  const handleSelectCrop = (option: CropOption) => {
    if (!option.supported) {
      return;
    }

    setStatus((prev) => ({ ...prev, error: null }));
    onChange((prev) => {
      const keepVariety = option.varieties.some(
        (variety) => variety.id === prev.selection.variety && variety.supported,
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
    if (!option.supported || !parent.supported) {
      return;
    }

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
    if (!metric || typeof metric.min !== 'number' || typeof metric.max !== 'number') {
      return null;
    }
    return (
      <Badge key={label} color="light" className="border border-slate-200 text-xs text-slate-600">
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

  const handleRetry = () => setReloadToken((token) => token + 1);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1.2fr)]">
      <div className="space-y-6">
        <Card className="border border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Crop selector</h2>
              <p className="text-sm text-slate-500">
                Choose a crop family and variety to preview deterministic defaults from the seed
                pack.
              </p>
            </div>
            <div className="space-y-4">
              {CROP_LIBRARY.map((crop) => (
                <div key={crop.id} className="space-y-2 rounded-2xl border border-slate-200 p-4">
                  <button
                    type="button"
                    onClick={() => handleSelectCrop(crop)}
                    className={`flex w-full flex-col text-left ${
                      crop.supported ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-base font-semibold">
                      {crop.label}{' '}
                      {!crop.supported ? (
                        <span className="text-xs font-medium text-amber-600">(coming soon)</span>
                      ) : null}
                    </span>
                    <span className="text-sm text-slate-500">{crop.description}</span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {crop.varieties.map((variety) => {
                      const isSelected =
                        selection.cropId === crop.id && selection.variety === variety.id;
                      return (
                        <button
                          key={variety.id}
                          type="button"
                          onClick={() => handleSelectVariety(variety, crop)}
                          disabled={!variety.supported || !crop.supported}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                          } ${!variety.supported ? 'opacity-50' : ''}`}
                        >
                          {variety.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Crop defaults preview</h3>
                <p className="text-sm text-slate-500">
                  Read-only excerpt pulled from `/api/crops/:cropId/:variety/defaults`.
                </p>
              </div>
              {status.loading ? <Spinner size="sm" /> : null}
            </div>
            {status.error ? (
              <Alert color="failure" className="text-sm">
                <div className="flex flex-col gap-2">
                  <span>{status.error}</span>
                  <Button color="light" size="xs" onClick={handleRetry}>
                    Retry
                  </Button>
                </div>
              </Alert>
            ) : null}

            {!selection.variety ? (
              <p className="text-sm text-slate-500">
                Pick a supported variety to hydrate the defaults panel.
              </p>
            ) : null}

            {showPreview && selection.defaults ? (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-600">
                    {selection.defaults.displayName ?? selection.varietyLabel}
                  </p>
                  {overview ? <p className="text-sm text-slate-600">{overview}</p> : null}
                </div>
                {safetyBadges.length ? (
                  <div className="flex flex-wrap gap-2">{safetyBadges}</div>
                ) : null}
                <ListGroup className="rounded-2xl border border-slate-200 text-sm text-slate-700">
                  {environment ? (
                    <ListGroupItem className="flex flex-col gap-1 rounded-none border-0 border-b border-slate-100">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Environment
                      </span>
                      <span>Day temp: {environment.temperature_day ?? '—'}</span>
                      <span>Night temp: {environment.temperature_night ?? '—'}</span>
                      <span>Humidity: {environment.humidity ?? '—'}</span>
                      <span>Light hours: {environment.light_hours ?? '—'}</span>
                    </ListGroupItem>
                  ) : null}
                  {irrigation ? (
                    <ListGroupItem className="flex flex-col gap-1 rounded-none border-0 border-b border-slate-100">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Irrigation
                      </span>
                      <span>Method: {irrigation.method ?? '—'}</span>
                      <span>Frequency: {irrigation.frequency ?? '—'}</span>
                      {irrigation.notes ? (
                        <span className="text-slate-500">{irrigation.notes}</span>
                      ) : null}
                    </ListGroupItem>
                  ) : null}
                  {container ? (
                    <ListGroupItem className="flex flex-col gap-1 rounded-none border-0">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Container
                      </span>
                      <span>Volume: {container.volume_liters ?? '—'}</span>
                      <span>Diameter: {container.diameter_cm ?? '—'}</span>
                      <span>Depth: {container.depth_cm ?? '—'}</span>
                    </ListGroupItem>
                  ) : null}
                </ListGroup>
                <StageList defaults={selection.defaults} />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <MiniAssist
          cropId={selection.cropId}
          variety={selection.variety}
          disabled={!selection.cropId || !selection.variety}
        />
      </Card>
    </section>
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
