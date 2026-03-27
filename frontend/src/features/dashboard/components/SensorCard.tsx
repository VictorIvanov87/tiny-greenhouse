import { Card } from 'flowbite-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'

type SensorCardProps = {
  label: string
  unit: string
  current: number | null
  sparklineData: Array<{ timestamp: number; value: number }>
  low: number
  high: number
  delta: number | null
  targetLabel: string
}

const sensorStatus = (
  value: number,
  low: number,
  high: number,
): 'ok' | 'warn' | 'critical' => {
  if (value < low * 0.8 || value > high * 1.2) return 'critical'
  if (value < low || value > high) return 'warn'
  return 'ok'
}

const STATUS_PILL_CLASSES = {
  ok: 'bg-emerald-900/50 text-emerald-300',
  warn: 'bg-amber-900/50 text-amber-300',
  critical: 'bg-rose-900/50 text-rose-300',
}

const STATUS_LABELS = {
  ok: 'In range',
  warn: 'Out of range',
  critical: 'Critical',
}

const SPARKLINE_STROKE = {
  ok: '#10b981',
  warn: '#f59e0b',
  critical: '#f43f5e',
}

const BORDER_CLASS = {
  ok: 'border-[#1f2a3d]',
  warn: 'border-amber-500/40',
  critical: 'border-rose-500/40',
}

export const SensorCard = ({
  label,
  unit,
  current,
  sparklineData,
  low,
  high,
  delta,
  targetLabel,
}: SensorCardProps) => {
  const status = current !== null ? sensorStatus(current, low, high) : 'ok'

  const deltaStr = (() => {
    if (delta === null || Number.isNaN(delta)) return null
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)}${unit} over window`
  })()

  return (
    <Card
      className={`rounded-3xl border ${BORDER_CLASS[status]} bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL_CLASSES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-slate-100">
          {current !== null ? current.toFixed(1) : '—'}
        </span>
        <span className="text-sm font-medium text-slate-400">{unit}</span>
      </div>

      {sparklineData.length > 0 && (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={SPARKLINE_STROKE[status]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{targetLabel}</span>
        {deltaStr && (
          <span
            className={
              delta! > 0
                ? 'text-emerald-400'
                : delta! < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }
          >
            {deltaStr}
          </span>
        )}
      </div>
    </Card>
  )
}
