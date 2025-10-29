import { Card } from 'flowbite-react'
import { alpha, palette } from '../../../theme/palette'

type Kpi = {
  id: string
  label: string
  value: string
  unit?: string
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: string
}

const kpis: Kpi[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    value: '24.6',
    unit: '°C',
    change: '+1.2°C vs. yesterday',
    trend: 'up',
    icon: '🌡️',
  },
  {
    id: 'humidity',
    label: 'Humidity',
    value: '62',
    unit: '%',
    change: '-3% vs. target',
    trend: 'down',
    icon: '💧',
  },
  {
    id: 'soil',
    label: 'Soil Moisture',
    value: '41',
    unit: '%',
    change: '+5% vs. last check',
    trend: 'up',
    icon: '🪴',
  },
  {
    id: 'light',
    label: 'Light Exposure',
    value: '13',
    unit: 'hrs',
    change: 'Stable',
    trend: 'stable',
    icon: '☀️',
  },
]

const trendStyles: Record<Kpi['trend'], string> = {
  up: 'text-emerald-600',
  down: 'text-amber-600',
  stable: 'text-gray-500',
}

export const KpiCards = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className="rounded-3xl border border-[color:var(--color-evergreen-soft)] bg-white/80 shadow-[0_18px_45px_rgba(31,111,74,0.12)] backdrop-blur"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--color-soil-60)]">
                {kpi.label}
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-[color:var(--color-evergreen)]">{kpi.value}</span>
                {kpi.unit ? <span className="text-sm font-medium text-[color:var(--color-soil-60)]">{kpi.unit}</span> : null}
              </div>
              <p className={`mt-2 text-sm font-medium ${trendStyles[kpi.trend]}`}>{kpi.change}</p>
            </div>
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-[0_12px_32px_rgba(31,111,74,0.18)]"
              style={{ background: alpha(palette.evergreen, 0.12) }}
              aria-hidden="true"
            >
              {kpi.icon}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
