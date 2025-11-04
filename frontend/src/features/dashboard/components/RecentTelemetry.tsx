import { useMemo, useState, type JSX } from 'react';
import {
  Alert,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableHeadCell,
  TableRow,
} from 'flowbite-react';

type TelemetryRow = {
  id: string;
  timestamp: string;
  temperature: string;
  humidity: string;
  soilMoisture: string;
  status: 'ok' | 'warning';
};

const mockTelemetry = (): TelemetryRow[] => [
  {
    id: 'row-1',
    timestamp: '2025-02-22 08:30',
    temperature: '24.4 °C',
    humidity: '61 %',
    soilMoisture: '42 %',
    status: 'ok',
  },
  {
    id: 'row-2',
    timestamp: '2025-02-22 08:00',
    temperature: '24.1 °C',
    humidity: '63 %',
    soilMoisture: '40 %',
    status: 'ok',
  },
  {
    id: 'row-3',
    timestamp: '2025-02-22 07:30',
    temperature: '23.9 °C',
    humidity: '65 %',
    soilMoisture: '38 %',
    status: 'warning',
  },
  {
    id: 'row-4',
    timestamp: '2025-02-22 07:00',
    temperature: '23.8 °C',
    humidity: '66 %',
    soilMoisture: '36 %',
    status: 'ok',
  },
];

const statusBadge: Record<TelemetryRow['status'], JSX.Element> = {
  ok: (
    <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
      Stable
    </Badge>
  ),
  warning: (
    <Badge className="border border-orange-400/30 bg-orange-500/10 text-orange-300">
      Check levels
    </Badge>
  ),
};

export const RecentTelemetry = () => {
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const rows = useMemo(() => (loading || error ? [] : mockTelemetry()), [loading, error]);

  if (loading) {
    return (
      <div className="space-y-3 rounded-3xl border border-[#1f2a3d] bg-[#111c2d] p-6">
        <div className="h-5 w-32 animate-pulse rounded-full bg-[#1b2842]" />
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-2xl bg-[#1b2842]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="rounded-3xl border border-red-500/40 bg-red-500/10 text-sm text-red-300">
        Unable to load telemetry right now. Please retry later.
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#1f2a3d] bg-[#0f1729] p-6 text-center text-sm text-slate-400">
        No telemetry samples yet. Connect your greenhouse sensors to start tracking vitals.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="flex items-center justify-between border-b border-[#1f2a3d] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Recent telemetry
          </h2>
          <p className="text-sm text-slate-400">
            Latest samples from your greenhouse sensors.
          </p>
        </div>
      </div>
      <Table>
        <TableHead className="bg-[#19253c] text-xs uppercase tracking-wide text-slate-400">
          <TableRow>
            <TableHeadCell>Timestamp</TableHeadCell>
            <TableHeadCell>Temperature</TableHeadCell>
            <TableHeadCell>Humidity</TableHeadCell>
            <TableHeadCell>Soil moisture</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y divide-[#1f2a3d]">
          {rows.map((row) => (
            <TableRow key={row.id} className="bg-[#111c2d] text-slate-200">
              <TableCell className="whitespace-nowrap font-medium text-slate-200">
                {row.timestamp}
              </TableCell>
              <TableCell>{row.temperature}</TableCell>
              <TableCell>{row.humidity}</TableCell>
              <TableCell>{row.soilMoisture}</TableCell>
              <TableCell>{statusBadge[row.status]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
