import { Button } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { useAlerts } from '../../alerts/AlertsProvider'

export const AlertBanner = () => {
  const { active } = useAlerts()
  const criticals = active.filter((a) => a.severity === 'critical')

  if (criticals.length === 0) return null

  const first = criticals[0]

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{
        border: '1.5px solid rgba(244, 63, 94, 0.4)',
        backgroundColor: 'rgba(136, 19, 55, 0.5)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#fda4af"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="shrink-0 font-semibold" style={{ color: '#fecdd3' }}>
          {criticals.length} critical alert{criticals.length > 1 ? 's' : ''} require your attention
        </span>
        <span className="hidden truncate text-sm sm:block" style={{ color: '#fda4af' }}>
          — {first.message}
        </span>
      </div>
      <Link to="/alerts">
        <Button size="xs" color="dark">
          View all
        </Button>
      </Link>
    </div>
  )
}
