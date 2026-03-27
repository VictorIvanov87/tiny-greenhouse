import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '../../../shared/ui/ChartCard'
import { bucketByMinute, sortByTimestamp, type WindowKey } from '../../telemetry/transforms'
import { getTelemetry, type TelemetrySample } from '../../telemetry/api'

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

type ChartPoint = {
  timestamp: number
  temperature?: number
  humidity?: number
  soilMoisture?: number
}

const windowFrom = (window: WindowKey): string => {
  if (window === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (window === '2h') return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

export const EnvironmentChart = ({ thresholds }: EnvironmentChartProps) => {
  const [timeWindow, setTimeWindow] = useState<WindowKey>('2h')
  const [samples, setSamples] = useState<TelemetrySample[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFetchError(null)
    getTelemetry({ from: windowFrom(timeWindow), limit: 2000 })
      .then((result) => {
        if (active) {
          setSamples(sortByTimestamp(result.items))
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setFetchError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [timeWindow])

  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }

  const chartData = useMemo((): ChartPoint[] => {
    const temp = bucketByMinute(samples, (s) => s.temperature)
    const humMap = new Map(
      bucketByMinute(samples, (s) => s.humidity).map((d) => [d.timestamp, d.value]),
    )
    const soilMap = new Map(
      bucketByMinute(samples, (s) => s.soilMoisture).map((d) => [d.timestamp, d.value]),
    )
    return temp.map(({ timestamp, value: temperature }) => ({
      timestamp,
      temperature,
      humidity: humMap.get(timestamp),
      soilMoisture: soilMap.get(timestamp),
    }))
  }, [samples])

  const tickFormatter = timeWindow === '7d' ? formatDateTick : formatTimeTick

  const windowSwitch = (
    <div
      className="inline-flex -space-x-px rounded-xl border border-slate-400 bg-slate-900/70 shadow-sm"
      role="group"
      aria-label="Time window"
    >
      {WINDOW_OPTIONS.map((w, index) => {
        const isActive = w === timeWindow
        const rounded =
          index === 0
            ? 'rounded-l-xl'
            : index === WINDOW_OPTIONS.length - 1
            ? 'rounded-r-xl'
            : 'rounded-none'
        return (
          <button
            key={w}
            type="button"
            onClick={() => setTimeWindow(w)}
            aria-pressed={isActive}
            className={`cursor-pointer text-sm font-semibold leading-5 px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${rounded} ${
              isActive
                ? 'z-10 rounded-xl border bg-[#1F6F4A] text-slate-100 shadow-[0_6px_22px_rgba(16,185,129,0.35)] ring-1 ring-emerald-300'
                : 'bg-transparent text-slate-200 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            {WINDOW_LABELS[w]}
          </button>
        )
      })}
    </div>
  )

  const overlayMessage = loading ? 'Loading…' : fetchError ? `Error: ${fetchError}` : chartData.length === 0 ? 'No data' : null

  return (
    <ChartCard
      title="Environment trends"
      footer={windowSwitch}
      contentClassName="relative min-w-0"
    >
      <div className="relative" style={{ height: 260 }}>
        {overlayMessage && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-400">
            {overlayMessage}
          </div>
        )}
        <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke="#1f2a3d" strokeDasharray="4 4" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={tickFormatter}
            tickSize={6}
            fontSize={12}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            yAxisId="temp"
            domain={['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            label={{ value: '°C', position: 'insideTopLeft', fill: '#94a3b8', fontSize: 10, dx: 4 }}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
            label={{ value: '%', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10, dx: -4 }}
          />
          <Tooltip
            contentStyle={{
              fontSize: '0.75rem',
              background: '#111c2d',
              border: '1px solid #1f2a3d',
              borderRadius: '0.5rem',
            }}
            labelFormatter={(value) => new Date(value as number).toLocaleString()}
            labelStyle={{ color: '#94a3b8', fontWeight: '600' }}
          />
          <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8', paddingTop: '8px' }} />

          {/* Temperature threshold lines */}
          <ReferenceLine
            yAxisId="temp"
            y={t.temp.high}
            stroke="#f97316"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
          <ReferenceLine
            yAxisId="temp"
            y={t.temp.low}
            stroke="#f97316"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />

          {/* Humidity threshold lines */}
          <ReferenceLine
            yAxisId="pct"
            y={t.humidity.high}
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
          <ReferenceLine
            yAxisId="pct"
            y={t.humidity.low}
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />

          {/* Soil moisture threshold line */}
          <ReferenceLine
            yAxisId="pct"
            y={t.soil.low}
            stroke="#10b981"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />

          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            name="Temperature (°C)"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="humidity"
            name="Humidity (%)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="soilMoisture"
            name="Soil (%)"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
