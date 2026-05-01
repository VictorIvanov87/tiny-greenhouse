
type SensorCardProps = {
  label: string
  unit: string
  current: number | null
  low: number
  high: number
}

const sensorStatus = (
  value: number,
  low: number,
  high: number,
): 'ok' | 'warn' | 'critical' => {
  if (value < low * 0.8 || value > high * 1.2) return 'critical'
  if (value < low || value > high) return 'warn'
  return 'ok'
}

type Status = 'ok' | 'warn' | 'critical' | 'nodata'

const BORDER_CLASS: Record<Status, string> = {
  ok: 'border-[#1f2a3d]',
  warn: 'border-amber-500/40',
  critical: 'border-rose-500/40',
  nodata: 'border-slate-500/40',
}

// Filled status icons (20x20)
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
    <path d="M6 10.5L8.5 13L14 7.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const WarnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
    <path d="M10 7V11" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="13.5" r="1" fill="#fbbf24" />
  </svg>
)

const CriticalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#7f1d1d" stroke="#f43f5e" strokeWidth="1.5" />
    <path d="M7 7L13 13M13 7L7 13" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const NoDataIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#7f1d1d" stroke="#f43f5e" strokeWidth="1.5" />
    <path d="M10 6V11" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="14" r="1" fill="#fb7185" />
  </svg>
)

const STATUS_ICON: Record<Status, React.FC> = {
  ok: CheckIcon,
  warn: WarnIcon,
  critical: CriticalIcon,
  nodata: NoDataIcon,
}

const MARKER_BG = {
  ok: '#10b981',
  warn: '#f59e0b',
  critical: '#f43f5e',
}

const MARKER_SHADOW = {
  ok: '0 0 8px rgba(16,185,129,0.6)',
  warn: '0 0 8px rgba(245,158,11,0.6)',
  critical: '0 0 8px rgba(244,63,94,0.6)',
}

/** Line from min to max with a dot at the current value position. */
const RangeGauge = ({
  current,
  low,
  high,
  unit,
  status,
}: {
  current: number
  low: number
  high: number
  unit: string
  status: 'ok' | 'warn' | 'critical'
}) => {
  const range = high - low || 1
  const pct = Math.max(0, Math.min(100, ((current - low) / range) * 100))
  const trimUnit = unit.trim()

  return (
    <div className="mt-auto pt-4">
      {/* Min / max labels */}
      <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
        <span>{low}{trimUnit}</span>
        <span>{high}{trimUnit}</span>
      </div>

      {/* Line + dot */}
      <div className="relative" style={{ height: 14 }}>
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#475569',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 1,
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: MARKER_BG[status],
            boxShadow: MARKER_SHADOW[status],
          }}
        />
      </div>
    </div>
  )
}

export const SensorCard = ({
  label,
  unit,
  current,
  low,
  high,
}: SensorCardProps) => {
  const status: Status = current !== null ? sensorStatus(current, low, high) : 'nodata'
  const Icon = STATUS_ICON[status]

  return (
    <div
      className={`flex flex-col rounded-2xl border ${BORDER_CLASS[status]} bg-[#0b1220] p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <Icon />
      </div>

      {current !== null ? (
        <>
          <div className="mt-4 flex flex-1 items-baseline justify-center gap-1.5">
            <span className="text-4xl font-bold text-slate-50">
              {current.toFixed(1)}
            </span>
            <span className="text-base font-medium text-slate-400">{unit}</span>
          </div>
          <RangeGauge current={current} low={low} high={high} unit={unit} status={status as 'ok' | 'warn' | 'critical'} />
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-slate-500">No data</span>
          <span className="text-xs text-slate-500">Sensor offline or not connected</span>
        </div>
      )}
    </div>
  )
}
