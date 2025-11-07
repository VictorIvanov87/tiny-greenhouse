import { Card } from 'flowbite-react'

export type TelemetryMetrics = {
  avgTemperature: number | null
  avgHumidity: number | null
  latestSoilMoisture: number | null
}

type KpiCardsProps = {
  metrics: TelemetryMetrics
}

const formatValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  return value.toFixed(1)
}

export const KpiCards = ({ metrics }: KpiCardsProps) => {
  const cards = [
    {
      id: 'avg-temp',
      label: 'Avg. temperature',
      value: formatValue(metrics.avgTemperature),
      unit: '°C',
      helper: 'Last 25 samples',
    },
    {
      id: 'avg-humidity',
      label: 'Avg. humidity',
      value: formatValue(metrics.avgHumidity),
      unit: '%',
      helper: 'Last 25 samples',
    },
    {
      id: 'soil',
      label: 'Latest soil moisture',
      value: formatValue(metrics.latestSoilMoisture),
      unit: '%',
      helper: 'Most recent sample',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <p className="text-sm text-slate-500">{card.label}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-slate-900">{card.value}</span>
            <span className="text-sm font-medium text-slate-500">{card.unit}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{card.helper}</p>
        </Card>
      ))}
    </div>
  )
}
