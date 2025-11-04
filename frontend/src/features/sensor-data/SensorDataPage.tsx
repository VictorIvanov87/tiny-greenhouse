import {
  Card,
  Badge,
  Table,
  TableHead,
  TableHeadCell,
  TableRow,
  TableCell,
  TableBody,
} from 'flowbite-react';

type SensorRow = {
  sensor: string;
  latestReading: string;
  status: 'Stable' | 'Watch' | 'Action';
  updated: string;
};

const sampleRows: SensorRow[] = [
  {
    sensor: 'Ambient Temperature',
    latestReading: '24.3 °C',
    status: 'Stable',
    updated: '2 minutes ago',
  },
  {
    sensor: 'Soil Moisture',
    latestReading: '18%',
    status: 'Watch',
    updated: '5 minutes ago',
  },
  {
    sensor: 'CO₂ Level',
    latestReading: '720 ppm',
    status: 'Stable',
    updated: '9 minutes ago',
  },
  {
    sensor: 'Water Reservoir',
    latestReading: '42%',
    status: 'Action',
    updated: '11 minutes ago',
  },
];

const statusColor: Record<SensorRow['status'], string> = {
  Stable: 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  Watch: 'border border-amber-400/30 bg-amber-500/10 text-amber-300',
  Action: 'border border-rose-400/30 bg-rose-500/10 text-rose-300',
};

const SensorDataPage = () => {
  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Sensor Data
        </h1>
        <p className="text-sm text-slate-400">
          Snapshot of your greenhouse telemetry. Detailed per-sensor charts will live here soon.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <Table hoverable className="[&>tbody>tr]:last:border-b-0">
          <TableHead className="bg-[#19253c] text-slate-400">
            <TableRow>
              <TableHeadCell>Sensor</TableHeadCell>
              <TableHeadCell>Latest reading</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Last updated</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-[#1f2a3d]">
            {sampleRows.map((row) => (
              <TableRow key={row.sensor} className="bg-[#111c2d] text-slate-200 hover:bg-[#1a2740]">
                <TableCell className="font-medium text-slate-200">
                  {row.sensor}
                </TableCell>
                <TableCell className="text-slate-400">
                  {row.latestReading}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusColor[row.status]
                    }`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-400">{row.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SensorDataPage;
