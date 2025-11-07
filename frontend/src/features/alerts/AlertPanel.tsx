import { Badge, Button, Card } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { useAlerts } from './AlertsProvider'
import { ackAlert } from './api'

const severityColor: Record<string, string> = {
  info: 'info',
  warn: 'warning',
  critical: 'failure',
}

const capitalize = (value: string) => value.replace(/_/g, ' ').toLowerCase()

export const AlertPanel = () => {
  const { active, refresh } = useAlerts()

  const handleAck = async (id: string) => {
    await ackAlert(id)
    await refresh()
  }

  return (
    <Card className="rounded-3xl border border-slate-200 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Active alerts</p>
          <p className="text-xs text-slate-500">Latest status from your sensors.</p>
        </div>
        <Badge color={active.length ? 'failure' : 'success'}>{active.length}</Badge>
      </div>

      {active.length === 0 ? (
        <div className="text-sm text-slate-500">All clear. No alerts at the moment.</div>
      ) : (
        <ul className="space-y-3">
          {active.slice(0, 3).map((alert) => (
            <li key={alert.id} className="rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-900">{capitalize(alert.type)}</span>
                <Badge color={severityColor[alert.severity]}>{alert.severity}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>{new Date(alert.startedAt).toLocaleString()}</span>
                {!alert.acknowledged ? (
                  <Button size="xs" color="light" onClick={() => handleAck(alert.id)}>
                    Acknowledge
                  </Button>
                ) : (
                  <span className="text-emerald-600">Acknowledged</span>
                )}
              </div>
            </li>
          ))}

          {active.length > 3 ? (
            <p className="text-xs text-slate-500">
              {active.length - 3} more alerts.{' '}
              <Link to="/alerts" className="text-emerald-600 underline">
                View all
              </Link>
            </p>
          ) : null}
        </ul>
      )}

      <div className="mt-4 text-right text-sm">
        <Link to="/alerts" className="text-emerald-600 underline">
          Go to alerts
        </Link>
      </div>
    </Card>
  )
}
