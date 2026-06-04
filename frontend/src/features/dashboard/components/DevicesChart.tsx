import { useMemo, useState } from 'react'
import { Card } from 'flowbite-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TimeWindowToggle } from '../../../shared/ui/TimeWindowToggle'
import { sortByTimestamp, type WindowKey } from '../../telemetry/transforms'
import { useTelemetryQuery, type TelemetrySample } from '../../telemetry/api'

const formatTimeTick = (value: number) =>
  new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const formatDateTick = (value: number) =>
  new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })

const windowFrom = (window: WindowKey): string => {
  if (window === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (window === '2h') return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

type StepPoint = { timestamp: number; value: number }

const stepSeries = (
  samples: TelemetrySample[],
  pick: (s: TelemetrySample) => boolean | undefined,
): StepPoint[] =>
  samples.map((s) => ({
    timestamp: Date.parse(s.timestamp),
    value: pick(s) ? 1 : 0,
  }))

type DeviceConfig = {
  key: 'pump' | 'lights' | 'fan'
  label: string
  stroke: string
  pick: (s: TelemetrySample) => boolean | undefined
}

const DEVICES: DeviceConfig[] = [
  // Pump pulses (5s) are far shorter than the telemetry cadence (5 min), so
  // instantaneous pumpOn is almost never sampled true. pumpPulsed is edge-latched
  // by the firmware — true on any interval where the pump ran. Fall back to
  // pumpOn for samples predating the field.
  { key: 'pump', label: 'Water pump', stroke: '#3b82f6', pick: (s) => s.pumpPulsed ?? s.pumpOn },
  { key: 'lights', label: 'Lights', stroke: '#eab308', pick: (s) => s.lightsOn },
  { key: 'fan', label: 'Fan', stroke: '#22d3ee', pick: (s) => s.fanOn },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: '0.75rem',
    background: '#111c2d',
    border: '1px solid #1f2a3d',
    borderRadius: '0.5rem',
  },
  labelStyle: { color: '#94a3b8', fontWeight: '600' as const },
}

export const DevicesChart = () => {
  const [timeWindow, setTimeWindow] = useState<WindowKey>('2h')

  const from = useMemo(() => windowFrom(timeWindow), [timeWindow])
  const now = useMemo(() => Date.now(), [from]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading: loading, error: queryError } = useTelemetryQuery({
    from,
    limit: 2000,
  })

  const samples = useMemo(() => sortByTimestamp(data?.items ?? []), [data])

  const fetchError =
    queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const tickFormatter = timeWindow === '7d' ? formatDateTick : formatTimeTick

  // Append a "now" sentinel so the step extends to the current time
  const appendNow = (points: StepPoint[]): StepPoint[] => {
    if (points.length === 0) return points
    const last = points[points.length - 1]
    if (last.timestamp >= now) return points
    return [...points, { timestamp: now, value: last.value }]
  }

  const dataForDevice = (cfg: DeviceConfig): StepPoint[] =>
    appendNow(stepSeries(samples, cfg.pick))

  const overlayMessage = loading
    ? 'Loading…'
    : fetchError
      ? `Error: ${fetchError}`
      : samples.length === 0
        ? 'No data'
        : null

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-100">Device activity</p>
        <TimeWindowToggle value={timeWindow} onChange={setTimeWindow} />
      </div>

      <div className="grid gap-4 grid-cols-1">
        {DEVICES.map((d) => {
          const chartData = dataForDevice(d)
          return (
            <div
              key={d.key}
              className="rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4"
            >
              <p className="mb-2 text-xs font-medium text-slate-400">{d.label}</p>
              <div className="relative" style={{ height: 100 }}>
                {overlayMessage ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-500">
                    {overlayMessage}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`grad-dev-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={d.stroke} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={d.stroke} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1f2a3d" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={[Date.parse(from), now]}
                        tickFormatter={tickFormatter}
                        tickSize={4}
                        fontSize={10}
                        tick={{ fill: '#64748b' }}
                        axisLine={{ stroke: '#1f2a3d' }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        tickFormatter={(v) => (v === 1 ? 'ON' : 'OFF')}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        labelFormatter={(value) => new Date(value as number).toLocaleString()}
                        formatter={(value: number) => [value === 1 ? 'ON' : 'OFF', d.label]}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="value"
                        name={d.label}
                        stroke={d.stroke}
                        strokeWidth={2}
                        fill={`url(#grad-dev-${d.key})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
