import { Badge, Card } from 'flowbite-react'
import { InternalLink } from '../../shared/ui/InternalLink'
import { useAlerts } from './AlertsProvider'

const severityColor: Record<string, string> = {
  info: 'info',
  warn: 'warning',
  critical: 'failure',
}

const capitalize = (value: string) => value.replace(/_/g, ' ').toLowerCase()

export const AlertPanel = () => {
  const { active } = useAlerts()

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">Active alerts</p>
          <p className="text-xs text-slate-400">Latest status from your sensors.</p>
        </div>
        <Badge color={active.length ? 'failure' : 'success'}>{active.length}</Badge>
      </div>

      {active.length === 0 ? (
        <div className="text-sm text-slate-400">All clear. No alerts at the moment.</div>
      ) : (
        <ul className="space-y-3">
          {active.slice(0, 5).map((alert) => (
            <li key={alert.id} className="rounded-2xl border border-[#22324a] p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-100">{capitalize(alert.type)}</span>
                <Badge color={severityColor[alert.severity]}>{alert.severity}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
              <div className="mt-2 text-xs text-slate-400">
                <span>{new Date(alert.startedAt).toLocaleString()}</span>
              </div>
            </li>
          ))}

          {active.length > 5 ? (
            <p className="text-xs text-slate-400">
              {active.length - 5} more alerts.{' '}
              <InternalLink to="/alerts">View all</InternalLink>
            </p>
          ) : null}
        </ul>
      )}

      <div className="mt-4 text-right">
        <InternalLink to="/alerts">Go to alerts</InternalLink>
      </div>
    </Card>
  )
}
