import { Card } from 'flowbite-react'

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
  up: 'text-emerald-400',
  down: 'text-orange-400',
  stable: 'text-slate-400',
}

export const KpiCards = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                {kpi.label}
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-100">{kpi.value}</span>
                {kpi.unit ? <span className="text-sm font-medium text-slate-400">{kpi.unit}</span> : null}
              </div>
              <p className={`mt-2 text-sm font-medium ${trendStyles[kpi.trend]}`}>{kpi.change}</p>
            </div>
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a2740] text-xl shadow-[0_16px_36px_rgba(8,20,38,0.4)]"
              style={{ color: '#38bdf8' }}
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
