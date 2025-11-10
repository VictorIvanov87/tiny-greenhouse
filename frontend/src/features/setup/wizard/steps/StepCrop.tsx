import { HelperText, Label, Select } from 'flowbite-react';
import type { Dispatch, SetStateAction } from 'react';
import type { CropKind, SetupData, Variety } from '../state';

type StepProps = {
  data: SetupData;
  onChange: Dispatch<SetStateAction<SetupData>>;
};

const cropOptions: Array<{ value: CropKind; label: string; disabled?: boolean }> = [
  { value: 'chillies', label: 'Chillies' },
  { value: 'lettuce', label: 'Lettuce', disabled: true },
  { value: 'strawberries', label: 'Strawberries', disabled: true },
];

const varietyOptions: Array<{ value: Variety; label: string; disabled?: boolean }> = [
  { value: 'variety-x', label: 'Variety X' },
  { value: 'variety-y', label: 'Variety Y', disabled: true },
  { value: 'variety-z', label: 'Variety Z', disabled: true },
];

const StepCrop = ({ data, onChange }: StepProps) => {
  const selectedKind = data.crop.kind ?? '';
  const selectedVariety = data.crop.variety ?? '';

  const handleKindChange = (value: string) => {
    const nextKind = (value || undefined) as CropKind | undefined;
    onChange((prev) => {
      const previousVariety = prev.crop.variety;
      return {
        ...prev,
        crop: {
          ...prev.crop,
          kind: nextKind,
          variety: nextKind === 'chillies' ? previousVariety ?? 'variety-x' : undefined,
        },
      };
    });
  };

  const handleVarietyChange = (value: string) => {
    onChange((prev) => ({
      ...prev,
      crop: {
        ...prev.crop,
        variety: (value || undefined) as Variety | undefined,
      },
    }));
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Select your crop</h2>
        <p className="text-sm text-slate-500">
          Placeholder options for now — only Chillies & Variety X are interactive.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-crop-kind">Crop type</Label>

          <Select
            id="wizard-crop-kind"
            value={selectedKind}
            onChange={(event) => handleKindChange(event.target.value)}
          >
            <option value="">Choose crop</option>
            {cropOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
                {option.disabled ? ' – coming soon' : ''}
              </option>
            ))}
          </Select>
          <HelperText className="text-xs text-slate-500">
            More crop templates arrive later — disabled items show what’s planned.
          </HelperText>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-crop-variety">Crop variety</Label>

          <Select
            id="wizard-crop-variety"
            value={selectedVariety}
            disabled={selectedKind !== 'chillies'}
            onChange={(event) => handleVarietyChange(event.target.value)}
          >
            <option value="">Choose variety</option>
            {varietyOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
                {option.disabled ? ' – unavailable' : ''}
              </option>
            ))}
          </Select>
          <HelperText className="text-xs text-slate-500">
            Enablement unlocks once you choose Chillies for now.
          </HelperText>
        </div>
      </div>
    </section>
  );
};

export default StepCrop;
