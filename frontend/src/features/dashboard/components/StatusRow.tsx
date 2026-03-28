import { Badge } from 'flowbite-react';

type StatusRowProps = {
  plantType?: string;
  lastSeenLabel?: string | null;
  criticalCount: number;
  warnCount: number;
};

const HealthPill = ({ criticalCount, warnCount }: { criticalCount: number; warnCount: number }) => {
  if (criticalCount > 0) {
    return <Badge color="failure" size="sm">{criticalCount} critical</Badge>;
  }
  if (warnCount > 0) {
    return <Badge color="warning" size="sm">{warnCount} warning{warnCount > 1 ? 's' : ''}</Badge>;
  }
  return <Badge color="success" size="sm">All clear — 0 active alerts</Badge>;
};

export const StatusRow = ({
  plantType,
  lastSeenLabel,
  criticalCount,
  warnCount,
}: StatusRowProps) => {
  const name = plantType ? `Welcome back, ${plantType.replace(/-/g, ' ')} caretaker` : 'Greenhouse';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{name}</h1>
        <p className="text-xs text-slate-400">{lastSeenLabel ?? 'Waiting for first reading…'}</p>
      </div>
      <HealthPill criticalCount={criticalCount} warnCount={warnCount} />
    </div>
  );
};
