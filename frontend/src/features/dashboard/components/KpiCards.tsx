import { Card } from 'flowbite-react';

export type MetricSnapshot = {
  label: string;
  unit: string;
  start: number | null;
  current: number | null;
  avg: number | null;
  delta: number | null;
};

export type TelemetryMetrics = {
  temperature: MetricSnapshot;
  humidity: MetricSnapshot;
  soilMoisture: MetricSnapshot;
};

type KpiCardsProps = {
  metrics: TelemetryMetrics;
};

const formatValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(1);
};

const formatWithUnit = (value: number | null, unit: string) => {
  const formatted = formatValue(value);
  return formatted === '—' ? formatted : `${formatted}${unit}`;
};

const formatDelta = (delta: number | null, unit: string) => {
  if (delta === null || Number.isNaN(delta)) {
    return '—';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}${unit}`;
};

const deltaTone = (delta: number | null) => {
  if (delta === null || Number.isNaN(delta) || delta === 0) return 'text-slate-400';
  return delta > 0 ? 'text-emerald-400' : 'text-rose-400';
};

export const KpiCards = ({ metrics }: KpiCardsProps) => {
  const cards = [
    { id: 'temp', metric: metrics.temperature },
    { id: 'humidity', metric: metrics.humidity },
    { id: 'soil', metric: metrics.soilMoisture },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(({ id, metric }) => (
        <Card key={id} className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
          <p className="text-sm font-semibold text-slate-100">{metric.label}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-slate-100">
              {formatValue(metric.current)}
            </span>
            <span className="text-sm font-medium text-slate-400">{metric.unit}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[#22324a] bg-[#0f1729] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Start
              </span>
              <span className="text-sm font-medium text-slate-200">
                {formatWithUnit(metric.start, metric.unit)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[#22324a] bg-[#0f1729] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                End
              </span>
              <span className="text-sm font-medium text-slate-200">
                {formatWithUnit(metric.current, metric.unit)}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Avg {formatWithUnit(metric.avg, metric.unit)}</span>
            <span className={`font-semibold ${deltaTone(metric.delta)}`}>
              Δ {formatDelta(metric.delta, metric.unit)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
};
