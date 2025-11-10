import { Label, Select, TextInput } from 'flowbite-react';
import type { Dispatch, SetStateAction } from 'react';
import type { PreferenceSettings, SetupData } from '../state';

type StepProps = {
  data: SetupData;
  onChange: Dispatch<SetStateAction<SetupData>>;
};

type NumericPrefKey = 'lightHours' | 'soilMoistureLow' | 'tempHigh' | 'timelapseHour';

const numericFields: Array<{
  key: NumericPrefKey;
  label: string;
  helper: string;
  min: number;
  max: number;
  suffix?: string;
}> = [
  {
    key: 'lightHours',
    label: 'Daily light exposure',
    helper: '1–24h cycle placeholder (defaults to 12h).',
    min: 1,
    max: 24,
    suffix: 'hrs',
  },
  {
    key: 'soilMoistureLow',
    label: 'Low soil moisture alert',
    helper: 'Trigger placeholder when moisture drops below this %.',
    min: 0,
    max: 100,
    suffix: '%',
  },
  {
    key: 'tempHigh',
    label: 'High temperature alert',
    helper: 'Warn when canopy temperature exceeds this value.',
    min: 5,
    max: 45,
    suffix: '°C',
  },
  {
    key: 'timelapseHour',
    label: 'Timelapse capture hour',
    helper: '24h clock; we only need a number for now.',
    min: 0,
    max: 23,
    suffix: 'h',
  },
];

const StepPrefs = ({ data, onChange }: StepProps) => {
  const prefs = data.prefs;

  const updatePrefs = (partial: Partial<PreferenceSettings>) => {
    onChange((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...partial,
      },
    }));
  };

  const handleNumberChange = (key: NumericPrefKey, raw: string) => {
    const parsed = raw === '' ? undefined : Number(raw);
    updatePrefs({
      [key]: Number.isNaN(parsed as number) ? undefined : parsed,
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Alarm defaults & language</h2>
        <p className="text-sm text-slate-500">
          These knobs do not wire into devices yet; they simply exercise validation + persistence.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {numericFields.map(({ key, label, helper, min, max, suffix }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`wizard-pref-${key}`}>{label}</Label>
            <TextInput
              id={`wizard-pref-${key}`}
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step="1"
              value={prefs[key]?.toString() ?? ''}
              onChange={(event) => handleNumberChange(key, event.target.value)}
            />
            <span className="text-xs text-slate-500">
              {helper} {suffix && `(${suffix})`}
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-language">Language</Label>
          <Select
            id="wizard-language"
            value={prefs.language ?? ''}
            onChange={(event) =>
              updatePrefs({
                language: (event.target.value || undefined) as PreferenceSettings['language'],
              })
            }
          >
            <option value="">Select language</option>
            <option value="en">English</option>
            <option value="bg">Bulgarian</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-method">Growing method</Label>
          <Select
            id="wizard-method"
            value={prefs.method ?? ''}
            onChange={(event) =>
              updatePrefs({
                method: (event.target.value || undefined) as PreferenceSettings['method'],
              })
            }
          >
            <option value="">Choose method</option>
            <option value="soil">Soil (default)</option>
            <option value="nft">NFT</option>
            <option value="dwc">DWC</option>
          </Select>
        </div>
      </div>
    </section>
  );
};

export default StepPrefs;
