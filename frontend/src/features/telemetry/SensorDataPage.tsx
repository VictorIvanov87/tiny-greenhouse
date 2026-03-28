import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Label,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from 'flowbite-react';
import { useTelemetryQuery } from './api';

const CARD_CLASS =
  'rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]';

const fieldStyle: React.CSSProperties = {
  backgroundColor: '#0b1220',
  color: '#e2e8f0',
  borderColor: '#22324a',
};

type SortKey = 'timestamp' | 'temperature' | 'humidity' | 'soilMoisture' | 'lightLux' | 'pressureHpa';
type SortDirection = 'asc' | 'desc' | null;

type FormState = {
  limit: string;
  from: string;
  to: string;
  sensor: string;
};

const DEFAULT_FORM: FormState = {
  limit: '100',
  from: '',
  to: '',
  sensor: '',
};

const PAGE_SIZE_OPTIONS = [25, 50] as const;
const LIMIT_OPTIONS = ['25', '50', '100', '200'];

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const toISOIfPresent = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // datetime-local gives "YYYY-MM-DDTHH:mm", convert to ISO
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
};

const buildQueryParams = (state: FormState) => ({
  limit: Number(state.limit) || 100,
  from: toISOIfPresent(state.from),
  to: toISOIfPresent(state.to),
  sensor: state.sensor.trim() || undefined,
});

const SensorDataPage = () => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [query, setQuery] = useState<FormState>(DEFAULT_FORM);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);

  const { data, isLoading: loading, error: queryError, refetch } = useTelemetryQuery(buildQueryParams(query));
  const total = data?.total ?? 0;
  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const sensorOptions = useMemo(() => {
    const items = data?.items ?? [];
    const unique = new Set(items.map((i) => i.sensor).filter(Boolean) as string[]);
    return [...unique].sort();
  }, [data]);

  // Reset to page 1 when data changes (new query)
  useEffect(() => {
    setPage(1);
  }, [data]);

  const toggleSort = (key: SortKey) => {
    if (key !== sortKey) {
      setSortKey(key);
      setSortDirection('asc');
      return;
    }

    setSortDirection((prev) => {
      if (prev === 'asc') {
        return 'desc';
      }

      if (prev === 'desc') {
        return null;
      }

      return 'asc';
    });
  };

  const sortedItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!sortDirection) {
      return items;
    }

    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortKey === 'timestamp') {
        const ta = Date.parse(a.timestamp);
        const tb = Date.parse(b.timestamp);
        return sortDirection === 'asc' ? ta - tb : tb - ta;
      }

      const valueA = a[sortKey] ?? 0;
      const valueB = b[sortKey] ?? 0;
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });

    return sorted;
  }, [data, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedItems]);

  const handleApplyFilters = () => {
    setQuery(form);
  };

  const handleResetFilters = () => {
    setForm(DEFAULT_FORM);
    setQuery(DEFAULT_FORM);
    setSortKey('timestamp');
    setSortDirection('desc');
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!pageItems.length) {
      return;
    }

    const rows = [
      ['timestamp', 'temperature', 'humidity', 'soilMoisture', 'lightLux', 'pressureHpa', 'sensor'],
      ...pageItems.map((row) => [
        row.timestamp,
        row.temperature.toString(),
        row.humidity.toString(),
        row.soilMoisture.toString(),
        row.lightLux != null ? row.lightLux.toString() : '',
        row.pressureHpa != null ? row.pressureHpa.toString() : '',
        row.sensor ?? '',
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sensor-data-page-${currentPage}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key || !sortDirection) {
      return null;
    }

    return <span className="ml-1 text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      );
    }

    if (error) {
      return (
        <Card className={`${CARD_CLASS} space-y-4 p-6`}>
          <Alert color="failure">
            <span className="font-semibold">Unable to load sensor data.</span> {error}
          </Alert>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      );
    }

    if (!sortedItems.length) {
      return (
        <Alert color="info" className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-300">
          No telemetry samples match the selected filters. Try adjusting the time range or limit.
        </Alert>
      );
    }

    return (
      <Card className={`${CARD_CLASS} space-y-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedItems.length)} of {sortedItems.length} samples
            (total {total})
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Label htmlFor="page-size" className="text-xs text-slate-500">
              Rows per page
            </Label>
            <Select
              id="page-size"
              value={pageSize.toString()}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
              className="w-24"
              style={fieldStyle}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
            <Button color="gray" size="xs" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto [&_table]:bg-transparent [&_thead]:bg-[#0b1220] [&_th]:text-slate-300 [&_td]:text-slate-300 [&_tr]:border-[#1f2a3d]">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('timestamp')}
                  >
                    Time {renderSortIndicator('timestamp')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('temperature')}
                  >
                    Temperature (°C) {renderSortIndicator('temperature')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('humidity')}
                  >
                    Humidity (%) {renderSortIndicator('humidity')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('soilMoisture')}
                  >
                    Soil moisture (%) {renderSortIndicator('soilMoisture')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('lightLux')}
                  >
                    Light (lux) {renderSortIndicator('lightLux')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>
                  <button
                    type="button"
                    className="flex items-center text-left text-sm font-semibold"
                    onClick={() => toggleSort('pressureHpa')}
                  >
                    Pressure (hPa) {renderSortIndicator('pressureHpa')}
                  </button>
                </TableHeadCell>
                <TableHeadCell>Sensor</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {pageItems.map((item) => (
                <TableRow key={`${item.timestamp}-${item.sensor ?? 'default'}`}>
                  <TableCell className="whitespace-nowrap font-medium text-slate-100">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                  <TableCell>{item.temperature.toFixed(1)}</TableCell>
                  <TableCell>{item.humidity.toFixed(1)}</TableCell>
                  <TableCell>{item.soilMoisture.toFixed(1)}</TableCell>
                  <TableCell>{item.lightLux != null ? item.lightLux.toFixed(1) : '—'}</TableCell>
                  <TableCell>{item.pressureHpa != null ? item.pressureHpa.toFixed(1) : '—'}</TableCell>
                  <TableCell>{item.sensor ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              color="gray"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              color="gray"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Sensor data</h1>
        <p className="text-sm text-slate-400">
          Explore raw telemetry samples with filters, sorting, and CSV export.
        </p>
      </div>

      <Card className={CARD_CLASS}>
        <p className="text-sm font-semibold text-slate-100">Filters</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-24">
            <Label htmlFor="limit" className="mb-1 text-xs text-slate-400">Limit</Label>
            <Select
              id="limit"
              value={form.limit}
              onChange={(event) => setForm((prev) => ({ ...prev, limit: event.target.value }))}
              style={fieldStyle}
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="from" className="mb-1 text-xs text-slate-400">From</Label>
            <TextInput
              id="from"
              type="datetime-local"
              value={form.from}
              onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="to" className="mb-1 text-xs text-slate-400">To</Label>
            <TextInput
              id="to"
              type="datetime-local"
              value={form.to}
              onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div className="w-36">
            <Label htmlFor="sensor" className="mb-1 text-xs text-slate-400">Sensor</Label>
            <Select
              id="sensor"
              value={form.sensor}
              onChange={(event) => setForm((prev) => ({ ...prev, sensor: event.target.value }))}
              style={fieldStyle}
            >
              <option value="">All sensors</option>
              {sensorOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button color="success" onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button color="gray" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {renderTable()}
    </div>
  );
};

export default SensorDataPage;
