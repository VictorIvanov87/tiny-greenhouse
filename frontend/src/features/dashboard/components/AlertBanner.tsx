import { Button } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { useAlerts } from '../../alerts/AlertsProvider'
import { ackAlert } from '../../alerts/api'

export const AlertBanner = () => {
  const { active, refresh } = useAlerts()
  const criticals = active.filter((a) => a.severity === 'critical')

  if (criticals.length === 0) return null

  const first = criticals[0]

  const handleAck = async () => {
    await ackAlert(first.id)
    await refresh()
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-900/50 px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <svg
          className="h-5 w-5 shrink-0 text-rose-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="shrink-0 font-semibold text-rose-200">
          {criticals.length} critical alert{criticals.length > 1 ? 's' : ''} require your attention
        </span>
        <span className="hidden truncate text-sm text-rose-300 sm:block">— {first.message}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="xs" color="failure" onClick={handleAck}>
          Acknowledge
        </Button>
        <Link to="/alerts">
          <Button size="xs" color="light">
            View all
          </Button>
        </Link>
      </div>
    </div>
  )
}
