import { useMemo, useState } from 'react'
import { Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react'
import type { TelemetrySample } from '../../telemetry/api'
import type { WindowKey } from '../../telemetry/transforms'
import { InternalLink } from '../../../shared/ui/InternalLink'
import { TimeWindowToggle } from '../../../shared/ui/TimeWindowToggle'

type Range = { low: number; high: number }
type Ranges = {
  temperature: Range
  humidity: Range
  soilMoisture: Range
  lightLux: Range
  pressureHpa: Range
}

type RecentReadingsProps = {
  items: TelemetrySample[]
  ranges: Ranges
}

const isInRange = (
  value: number | null | undefined,
  range: Range,
): 'ok' | 'warn' | null => {
  if (value == null) return null
  if (value >= range.low && value <= range.high) return 'ok'
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

export const RecentReadings = ({ items, ranges }: RecentReadingsProps) => {
  const [timeWindow, setTimeWindow] = useState<WindowKey>('2h')

  const rows = useMemo(() => {
    const cutoff = Date.now() - windowFromMs(timeWindow)
    return [...items]
      .filter((s) => new Date(s.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  }, [items, timeWindow])

  const ValueCell = ({ value, rangeKey, unit }: {
    value: number | null | undefined
    rangeKey: keyof Ranges
    unit: string
  }) => {
    const status = isInRange(value, ranges[rangeKey])
    return (
      <TableCell
        className="text-right"
        style={{ color: status ? VALUE_COLOR[status] : '#94a3b8' }}
      >
        {value != null ? `${fmt(value)}${unit}` : '—'}
      </TableCell>
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
        <div className="mt-3 overflow-x-auto [&_table]:bg-transparent [&_thead]:bg-[#0b1220] [&_th]:text-slate-500 [&_th]:text-xs [&_th]:font-medium [&_td]:text-slate-300 [&_tr]:border-[#1f2a3d]">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Time</TableHeadCell>
                <TableHeadCell className="text-right">Temp</TableHeadCell>
                <TableHeadCell className="text-right">Hum</TableHeadCell>
                <TableHeadCell className="text-right">Soil</TableHeadCell>
                <TableHeadCell className="text-right">Light</TableHeadCell>
                <TableHeadCell className="text-right">hPa</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-[#1f2a3d]">
              {rows.map((s) => (
                <TableRow key={s.timestamp}>
                  <TableCell className="whitespace-nowrap text-xs text-slate-400">
                    {formatTime(s.timestamp)}
                  </TableCell>
                  <ValueCell value={s.temperature} rangeKey="temperature" unit=" °C" />
                  <ValueCell value={s.humidity} rangeKey="humidity" unit=" %" />
                  <ValueCell value={s.soilMoisture} rangeKey="soilMoisture" unit=" %" />
                  <ValueCell value={s.lightLux} rangeKey="lightLux" unit="" />
                  <ValueCell value={s.pressureHpa} rangeKey="pressureHpa" unit="" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 text-right">
        <InternalLink to="/sensor-data">View full history</InternalLink>
      </div>
    </Card>
  )
}
