import { ListGroup, ListGroupItem } from 'flowbite-react';
import type { Dispatch, SetStateAction } from 'react';
import type { SetupData } from '../state';

type StepProps = {
  data: SetupData;
  onChange?: Dispatch<SetStateAction<SetupData>>;
};

const formatValue = (label: string, value?: string | number) => value ?? `Set in ${label}`;

const StepReview = ({ data }: StepProps) => {
  const cropSummary = data.crop.kind
    ? `${capitalize(data.crop.kind)} · ${
        data.crop.variety ? prettifyVariety(data.crop.variety) : 'Variety TBD'
      }`
    : 'No crop selected yet';

  const summary = [
    { label: 'Crop & Variety', value: cropSummary },
    {
      label: 'Language',
      value: data.prefs.language ? languageCopy[data.prefs.language] : 'English (default)',
    },
    {
      label: 'Method',
      value: data.prefs.method ? data.prefs.method.toUpperCase() : 'Soil (default)',
    },
    { label: 'Light hours', value: formatValue('Prefs', data.prefs.lightHours) },
    { label: 'Soil moisture low', value: formatValue('Prefs', data.prefs.soilMoistureLow) },
    { label: 'Temp high', value: formatValue('Prefs', data.prefs.tempHigh) },
    { label: 'Timelapse hour', value: formatValue('Prefs', data.prefs.timelapseHour) },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Review & finish</h2>
        <p className="text-sm text-slate-500">
          Finish will call the greenhouse API with placeholder values, mark local setup complete,
          and return to the dashboard.
        </p>
      </div>
      <ListGroup className="rounded-2xl border border-slate-200">
        {summary.map((item) => (
          <ListGroupItem
            key={item.label}
            className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-slate-500">{item.label}</span>
            <span className="text-base text-slate-900">{item.value}</span>
          </ListGroupItem>
        ))}
      </ListGroup>
    </section>
  );
};

const languageCopy: Record<'en' | 'bg', string> = {
  en: 'English',
  bg: 'Bulgarian',
};

const prettifyVariety = (value: string) =>
  value
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default StepReview;
