import { useMemo, useState } from 'react'
import { Card } from 'flowbite-react'
import type { TelemetrySample } from '../../telemetry/api'
import type { WindowKey } from '../../telemetry/transforms'
import { InternalLink } from '../../../shared/ui/InternalLink'
import { TimeWindowToggle } from '../../../shared/ui/TimeWindowToggle'

type RecentReadingsProps = {
  items: TelemetrySample[]
}

// Thresholds for color coding (must match SensorCard / EnvironmentChart)
const RANGES = {
  temperature: { low: 18, high: 26 },
  humidity: { low: 40, high: 70 },
  soilMoisture: { low: 20, high: 80 },
  lightLux: { low: 100, high: 50000 },
  pressureHpa: { low: 950, high: 1050 },
}

const isInRange = (value: number | null | undefined, key: keyof typeof RANGES): 'ok' | 'warn' | null => {
  if (value == null) return null
  const { low, high } = RANGES[key]
  if (value >= low && value <= high) return 'ok'
  return 'warn'
}

const VALUE_COLOR = {
  ok: '#34d399',   // emerald-400
  warn: '#fb7185', // rose-400
}

const formatTime = (timestamp: string): string => {
  const ms = Date.now() - new Date(timestamp).getTime()
  if (ms < 60_000) return 'Just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  // Older than 24h — show date/time
  return new Date(timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

const windowFromMs = (w: WindowKey): number => {
  if (w === '2h') return 2 * 60 * 60 * 1000
  if (w === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return Date.now() - d.getTime()
  }
  return 7 * 24 * 60 * 60 * 1000
}

const fmt = (v: number) => v.toFixed(1)

export const RecentReadings = ({ items }: RecentReadingsProps) => {
  const [timeWindow, setTimeWindow] = useState<WindowKey>('2h')

  const rows = useMemo(() => {
    const cutoff = Date.now() - windowFromMs(timeWindow)
    return [...items]
      .filter((s) => new Date(s.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  }, [items, timeWindow])

  const ValueCell = ({ value, rangeKey, unit, align = 'right' }: {
    value: number | null | undefined
    rangeKey: keyof typeof RANGES
    unit: string
    align?: 'left' | 'right'
  }) => {
    const status = isInRange(value, rangeKey)
    return (
      <td
        className={`py-2 ${align === 'right' ? 'text-right' : 'text-left'} ${align === 'right' ? 'pl-3' : 'pr-3'}`}
        style={{ color: status ? VALUE_COLOR[status] : '#94a3b8' }}
      >
        {value != null ? `${fmt(value)}${unit}` : '—'}
      </td>
    )
  }

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">Last readings</p>
        <TimeWindowToggle value={timeWindow} onChange={setTimeWindow} />
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No readings in this period.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f2a3d] text-xs text-slate-500">
                <th className="pb-2 text-left font-medium">Time</th>
                <th className="pb-2 pl-3 text-right font-medium">Temp</th>
                <th className="pb-2 pl-3 text-right font-medium">Hum</th>
                <th className="pb-2 pl-3 text-right font-medium">Soil</th>
                <th className="pb-2 pl-3 text-right font-medium">Light</th>
                <th className="pb-2 pl-3 text-right font-medium">hPa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2a3d]">
              {rows.map((s) => (
                <tr key={s.timestamp}>
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-400">
                    {formatTime(s.timestamp)}
                  </td>
                  <ValueCell value={s.temperature} rangeKey="temperature" unit=" °C" />
                  <ValueCell value={s.humidity} rangeKey="humidity" unit=" %" />
                  <ValueCell value={s.soilMoisture} rangeKey="soilMoisture" unit=" %" />
                  <ValueCell value={s.lightLux} rangeKey="lightLux" unit="" />
                  <ValueCell value={s.pressureHpa} rangeKey="pressureHpa" unit="" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-right">
        <InternalLink to="/sensor-data">View full history</InternalLink>
      </div>
    </Card>
  )
}
