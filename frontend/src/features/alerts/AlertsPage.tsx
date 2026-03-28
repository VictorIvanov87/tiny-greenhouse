import { Badge, Button } from 'flowbite-react'
import { useAlerts } from './AlertsProvider'
import type { Alert } from './api'
import { InternalLink } from '../../shared/ui/InternalLink'

const CARD_CLASS =
  'rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]'

const formatDuration = (startedAt: string): string => {
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

const formatLastChecked = (date: Date | null): string => {
  if (!date) return 'Checking...'
  const ms = Date.now() - date.getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  return `${mins}m ago`
}

const severityConfig = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        borderColor: 'rgba(244,63,94,0.4)',
        badgeColor: 'failure' as const,
        iconBg: '#7f1d1d',
        iconStroke: '#fb7185',
        label: 'Critical',
      }
    case 'warn':
      return {
        borderColor: 'rgba(245,158,11,0.4)',
        badgeColor: 'warning' as const,
        iconBg: '#78350f',
        iconStroke: '#fbbf24',
        label: 'Warning',
      }
    default:
      return {
        borderColor: 'rgba(56,189,248,0.4)',
        badgeColor: 'info' as const,
        iconBg: '#0c4a6e',
        iconStroke: '#7dd3fc',
        label: 'Info',
      }
  }
}

const SeverityIcon = ({ severity }: { severity: Alert['severity'] }) => {
  const s = severityConfig(severity)
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
      <circle cx="16" cy="16" r="14" fill={s.iconBg} stroke={s.borderColor} strokeWidth="1.5" />
      <path d="M16 10V18" stroke={s.iconStroke} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="22" r="1.5" fill={s.iconStroke} />
    </svg>
  )
}

const AlertCard = ({ alert }: { alert: Alert }) => {
  const s = severityConfig(alert.severity)

  return (
    <div
      className="rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: s.borderColor }}
    >
      <div className="flex gap-3">
        <SeverityIcon severity={alert.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">
              {alert.type.replace(/_/g, ' ').toLowerCase()}
            </span>
            <Badge color={s.badgeColor} size="sm">{s.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {alert.value !== undefined && alert.threshold !== undefined && (
              <span>
                Value: <span className="text-slate-200">{alert.value}</span> / Threshold:{' '}
                <span className="text-slate-200">{alert.threshold}</span>
              </span>
            )}
            <span>Active for {formatDuration(alert.startedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4">
      <circle cx="24" cy="24" r="20" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
      <path d="M16 24L22 30L32 18" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <p className="text-lg font-semibold text-slate-100">All clear</p>
    <p className="mt-1 text-sm text-slate-400">No active alerts at the moment.</p>
  </div>
)

const AlertsPage = () => {
  const { active, lastFetchedAt, refresh } = useAlerts()

  const criticalCount = active.filter((a) => a.severity === 'critical').length
  const warnCount = active.filter((a) => a.severity === 'warn').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Alerts</h1>
          <p className="text-sm text-slate-400">Monitor environment issues and sensor status.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Last checked: {formatLastChecked(lastFetchedAt)}
          </span>
          <Button color="gray" size="sm" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className={`${CARD_CLASS} p-5`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Active alerts
          </h2>
          {active.length > 0 ? (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge color="failure">{criticalCount} critical</Badge>
              )}
              {warnCount > 0 && (
                <Badge color="warning">{warnCount} warning{warnCount > 1 ? 's' : ''}</Badge>
              )}
            </div>
          ) : (
            <Badge color="success">0 alerts</Badge>
          )}
        </div>

        {active.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {active.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      <div className="text-right">
        <InternalLink to="/dashboard">Back to dashboard</InternalLink>
      </div>
    </div>
  )
}

export default AlertsPage
