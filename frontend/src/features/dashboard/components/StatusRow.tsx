type StatusRowProps = {
  plantType?: string
  lastSeenLabel?: string | null
  criticalCount: number
  warnCount: number
}

const HealthPill = ({
  criticalCount,
  warnCount,
}: {
  criticalCount: number
  warnCount: number
}) => {
  if (criticalCount > 0) {
    return (
      <span className="rounded-full bg-rose-900/50 px-3 py-1 text-xs font-semibold text-rose-300">
        {criticalCount} critical
      </span>
    )
  }
  if (warnCount > 0) {
    return (
      <span className="rounded-full bg-amber-900/50 px-3 py-1 text-xs font-semibold text-amber-300">
        {warnCount} warning{warnCount > 1 ? 's' : ''}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-300">
      All clear — 0 active alerts
    </span>
  )
}

export const StatusRow = ({
  plantType,
  lastSeenLabel,
  criticalCount,
  warnCount,
}: StatusRowProps) => {
  const name = plantType
    ? `${plantType.replace(/-/g, ' ')} caretaker`
    : 'Greenhouse'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{name}</h1>
        <p className="text-xs text-slate-400">{lastSeenLabel ?? 'Waiting for first reading…'}</p>
      </div>
      <HealthPill criticalCount={criticalCount} warnCount={warnCount} />
    </div>
  )
}
