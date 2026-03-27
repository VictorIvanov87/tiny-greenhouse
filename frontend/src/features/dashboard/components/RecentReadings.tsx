import { Card } from 'flowbite-react'
import { Link } from 'react-router-dom'
import type { TelemetrySample } from '../../telemetry/api'

type RecentReadingsProps = {
  items: TelemetrySample[]
}

const relativeTime = (timestamp: string): string => {
  const ms = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'Just now'
  return `${minutes} min ago`
}

const fmt = (v: number) => v.toFixed(1)

export const RecentReadings = ({ items }: RecentReadingsProps) => {
  const rows = [...items]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <p className="text-sm font-semibold text-slate-100">Last readings</p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No readings yet. Data will appear once sensors report in.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr className="border-b border-[#1f2a3d] text-xs text-slate-500">
                <th className="pb-2 text-left font-medium">Time</th>
                <th className="pb-2 text-right font-medium">Temp</th>
                <th className="pb-2 text-right font-medium">Hum</th>
                <th className="pb-2 pl-3 text-right font-medium">Soil</th>
                <th className="pb-2 pl-3 text-right font-medium">Light</th>
                <th className="pb-2 pl-3 text-right font-medium">hPa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2a3d]">
              {rows.map((s) => (
                <tr key={s.timestamp}>
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-400">
                    {relativeTime(s.timestamp)}
                  </td>
                  <td className="py-2 text-right">{fmt(s.temperature)} °C</td>
                  <td className="py-2 text-right">{fmt(s.humidity)} %</td>
                  <td className="py-2 pl-3 text-right">{fmt(s.soilMoisture)} %</td>
                  <td className="py-2 pl-3 text-right">{s.lightLux != null ? fmt(s.lightLux) : '—'}</td>
                  <td className="py-2 pl-3 text-right">{s.pressureHpa != null ? fmt(s.pressureHpa) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-right text-xs">
        <Link to="/sensor-data" className="text-emerald-400 underline">
          View full history →
        </Link>
      </div>
    </Card>
  )
}
