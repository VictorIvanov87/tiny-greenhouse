import { Button } from 'flowbite-react'
import type { WindowKey } from '../../features/telemetry/transforms'

const OPTIONS: WindowKey[] = ['2h', 'today', '7d']
const LABELS: Record<WindowKey, string> = { '2h': '2 h', today: 'Today', '7d': '7 d' }

type TimeWindowToggleProps = {
  value: WindowKey
  onChange: (value: WindowKey) => void
}

export const TimeWindowToggle = ({ value, onChange }: TimeWindowToggleProps) => (
  <div
    className="relative inline-flex rounded-lg p-0.5"
    style={{ backgroundColor: '#1e293b' }}
    role="group"
    aria-label="Time window"
  >
    {OPTIONS.map((w) => {
      const isActive = w === value
      return (
        <Button
          key={w}
          size="xs"
          color={isActive ? 'success' : 'gray'}
          onClick={() => onChange(w)}
          className="relative z-10 border-none shadow-none"
          style={{
            color: isActive ? '#fff' : '#94a3b8',
            backgroundColor: isActive ? '#10b981' : 'transparent',
            boxShadow: isActive ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
          }}
        >
          {LABELS[w]}
        </Button>
      )
    })}
  </div>
)
