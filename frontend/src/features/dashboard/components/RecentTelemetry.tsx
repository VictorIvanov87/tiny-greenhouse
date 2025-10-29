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
  ok: <Badge color="success">Stable</Badge>,
  warning: <Badge color="warning">Check levels</Badge>,
};

export const RecentTelemetry = () => {
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const rows = useMemo(() => (loading || error ? [] : mockTelemetry()), [loading, error]);

  if (loading) {
    return (
      <div className="space-y-3 rounded-3xl border border-[color:var(--color-evergreen-soft)] bg-white/70 p-6">
        <div className="h-5 w-32 animate-pulse rounded-full bg-[color:var(--color-evergreen-soft)]" />
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-2xl bg-[color:var(--color-evergreen-soft)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        color="failure"
        className="rounded-3xl border border-red-200 bg-red-50 text-sm text-red-700"
      >
        Unable to load telemetry right now. Please retry later.
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--color-evergreen-soft)] bg-white/60 p-6 text-center text-sm text-[color:var(--color-soil-60)]">
        No telemetry samples yet. Connect your greenhouse sensors to start tracking vitals.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--color-evergreen-soft)] bg-white/80 shadow-[0_18px_45px_rgba(31,111,74,0.12)]">
      <div className="flex items-center justify-between border-b border-[color:var(--color-evergreen-soft)] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--color-evergreen)]">
            Recent telemetry
          </h2>
          <p className="text-sm text-[color:var(--color-soil-60)]">
            Latest samples from your greenhouse sensors.
          </p>
        </div>
      </div>
      <Table>
        <TableHead className="bg-[rgba(31,111,74,0.06)] text-xs uppercase tracking-wide text-[color:var(--color-soil-60)]">
          <TableRow>
            <TableHeadCell>Timestamp</TableHeadCell>
            <TableHeadCell>Temperature</TableHeadCell>
            <TableHeadCell>Humidity</TableHeadCell>
            <TableHeadCell>Soil moisture</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {rows.map((row) => (
            <TableRow key={row.id} className="bg-white/60">
              <TableCell className="whitespace-nowrap font-medium text-[color:var(--color-soil)]">
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
