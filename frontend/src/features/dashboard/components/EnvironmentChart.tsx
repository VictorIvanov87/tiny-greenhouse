import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { bucketByMinute, sortByTimestamp, type WindowKey } from '../../telemetry/transforms'
import { useTelemetryQuery } from '../../telemetry/api'

type Thresholds = {
  temp: { low: number; high: number }
  humidity: { low: number; high: number }
  soil: { low: number }
}

type EnvironmentChartProps = {
  thresholds?: Partial<Thresholds>
}

const DEFAULT_THRESHOLDS: Thresholds = {
  temp: { low: 18, high: 26 },
  humidity: { low: 40, high: 70 },
  soil: { low: 20 },
}

const WINDOW_OPTIONS: WindowKey[] = ['2h', 'today', '7d']
const WINDOW_LABELS: Record<WindowKey, string> = { '2h': '2 h', today: 'Today', '7d': '7 d' }

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

type MetricConfig = {
  key: string
  label: string
  unit: string
  stroke: string
  fill: string
  domain: [number | string, number | string]
  thresholds?: { value: number; stroke: string }[]
}

const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: '0.75rem',
    background: '#111c2d',
    border: '1px solid #1f2a3d',
    borderRadius: '0.5rem',
  },
  labelStyle: { color: '#94a3b8', fontWeight: '600' as const },
}

type BucketPoint = { timestamp: number; value: number }

export const EnvironmentChart = ({ thresholds }: EnvironmentChartProps) => {
  const [timeWindow, setTimeWindow] = useState<WindowKey>('2h')

  const from = useMemo(() => windowFrom(timeWindow), [timeWindow])
  const now = useMemo(() => Date.now(), [from]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading: loading, error: queryError } = useTelemetryQuery({
    from,
    limit: 2000,
  })

  const samples = useMemo(
    () => sortByTimestamp(data?.items ?? []),
    [data],
  )

  const fetchError = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }

  const buckets = useMemo(() => {
    const temp = bucketByMinute(samples, (s) => s.temperature)
    const humidity = bucketByMinute(samples, (s) => s.humidity)
    const soil = bucketByMinute(samples, (s) => s.soilMoisture)
    const light = bucketByMinute(samples, (s) => s.lightLux ?? 0)
    return { temp, humidity, soil, light }
  }, [samples])

  // Append a "now" sentinel so the x-axis always extends to the current time
  const appendNow = (points: BucketPoint[]): BucketPoint[] => {
    if (points.length === 0) return points
    const last = points[points.length - 1]
    if (last.timestamp >= now) return points
    return [...points, { timestamp: now, value: undefined as unknown as number }]
  }

  const tickFormatter = timeWindow === '7d' ? formatDateTick : formatTimeTick

  const metrics: MetricConfig[] = [
    {
      key: 'temp',
      label: 'Temperature',
      unit: '°C',
      stroke: '#f97316',
      fill: 'rgba(249,115,22,0.1)',
      domain: ['auto', 'auto'],
      thresholds: [
        { value: t.temp.low, stroke: '#f97316' },
        { value: t.temp.high, stroke: '#f97316' },
      ],
    },
    {
      key: 'humidity',
      label: 'Humidity',
      unit: '%',
      stroke: '#3b82f6',
      fill: 'rgba(59,130,246,0.1)',
      domain: [0, 100],
      thresholds: [
        { value: t.humidity.low, stroke: '#3b82f6' },
        { value: t.humidity.high, stroke: '#3b82f6' },
      ],
    },
    {
      key: 'soil',
      label: 'Soil moisture',
      unit: '%',
      stroke: '#10b981',
      fill: 'rgba(16,185,129,0.1)',
      domain: [0, 100],
      thresholds: [
        { value: t.soil.low, stroke: '#10b981' },
      ],
    },
    {
      key: 'light',
      label: 'Light',
      unit: ' lux',
      stroke: '#eab308',
      fill: 'rgba(234,179,8,0.1)',
      domain: ['auto', 'auto'],
    },
  ]

  const dataForMetric = (key: string): BucketPoint[] => {
    switch (key) {
      case 'temp': return appendNow(buckets.temp)
      case 'humidity': return appendNow(buckets.humidity)
      case 'soil': return appendNow(buckets.soil)
      case 'light': return appendNow(buckets.light)
      default: return []
    }
  }

  const overlayMessage = loading ? 'Loading…' : fetchError ? `Error: ${fetchError}` : samples.length === 0 ? 'No data' : null

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-100">Environment trends</p>

        {/* Time window toggle */}
        <div
          className="relative inline-flex rounded-lg p-0.5"
          style={{ backgroundColor: '#1e293b' }}
          role="group"
          aria-label="Time window"
        >
          {WINDOW_OPTIONS.map((w) => {
            const isActive = w === timeWindow
            return (
              <button
                key={w}
                type="button"
                onClick={() => setTimeWindow(w)}
                aria-pressed={isActive}
                className="relative z-10 cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#10b981' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                {WINDOW_LABELS[w]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2x2 chart grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {metrics.map((m) => {
          const chartData = dataForMetric(m.key)
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-[#1f2a3d] bg-[#111c2d] p-4 shadow-[0_12px_30px_rgba(8,20,38,0.25)]"
            >
              <p className="mb-2 text-xs font-medium text-slate-400">{m.label}</p>
              <div className="relative" style={{ height: 160 }}>
                {overlayMessage ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-500">
                    {overlayMessage}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={m.stroke} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={m.stroke} stopOpacity={0} />
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
                        domain={m.domain}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        labelFormatter={(value) => new Date(value as number).toLocaleString()}
                        formatter={(value: number) => [value != null ? `${value.toFixed(1)}${m.unit}` : '—', m.label]}
                      />
                      {m.thresholds?.map((th) => (
                        <ReferenceLine
                          key={th.value}
                          y={th.value}
                          stroke={th.stroke}
                          strokeDasharray="4 2"
                          strokeOpacity={0.35}
                        />
                      ))}
                      <Area
                        type="monotone"
                        dataKey="value"
                        name={m.label}
                        stroke={m.stroke}
                        strokeWidth={2}
                        fill={`url(#grad-${m.key})`}
                        dot={false}
                        connectNulls={false}
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
    </div>
  )
}
