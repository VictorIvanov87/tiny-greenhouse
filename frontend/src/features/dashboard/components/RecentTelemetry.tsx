import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from 'flowbite-react';
import { useMemo } from 'react';
import type { TelemetrySample } from '../../telemetry/api';

type RecentTelemetryProps = {
  items: TelemetrySample[];
  total: number;
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const toEpoch = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return timestampFormatter.format(new Date(parsed));
};

const formatNumber = (value: number) => value.toFixed(1);

export const RecentTelemetry = ({ items, total }: RecentTelemetryProps) => {
  const rows = useMemo(
    () => [...items].sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp)),
    [items],
  );

  return (
    <Card className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent telemetry</h2>
          <p className="text-sm text-slate-500">
            Showing {rows.length} of {total} samples
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-hidden px-6 pb-6">
        <div className="overflow-x-auto">
          <div className="h-[26rem] overflow-y-auto rounded-2xl border border-slate-100">
            <Table hoverable className="min-w-full">
              <TableHead className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHeadCell>Timestamp</TableHeadCell>
                  <TableHeadCell>Temperature (°C)</TableHeadCell>
                  <TableHeadCell>Humidity (%)</TableHeadCell>
                  <TableHeadCell>Soil moisture (%)</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                      No telemetry samples yet. Data will appear once sensors report in.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((sample) => (
                    <TableRow key={sample.timestamp}>
                      <TableCell className="whitespace-nowrap font-medium text-slate-900">
                        {formatTimestamp(sample.timestamp)}
                      </TableCell>
                      <TableCell>{formatNumber(sample.temperature)}</TableCell>
                      <TableCell>{formatNumber(sample.humidity)}</TableCell>
                      <TableCell>{formatNumber(sample.soilMoisture)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Card>
  );
};
