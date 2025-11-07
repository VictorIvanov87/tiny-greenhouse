import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getTelemetry, type TelemetrySample } from './api';

type SortKey = 'timestamp' | 'temperature' | 'humidity' | 'soilMoisture';
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

const SensorDataPage = () => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [query, setQuery] = useState<FormState>(DEFAULT_FORM);
  const [items, setItems] = useState<TelemetrySample[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);

  const buildQueryParams = (state: FormState) => ({
    limit: Number(state.limit) || 100,
    from: state.from.trim() || undefined,
    to: state.to.trim() || undefined,
    sensor: state.sensor.trim() || undefined,
  });

  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getTelemetry(buildQueryParams(query));
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load telemetry';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

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
    if (!sortDirection) {
      return items;
    }

    const data = [...items];
    data.sort((a, b) => {
      if (sortKey === 'timestamp') {
        const ta = Date.parse(a.timestamp);
        const tb = Date.parse(b.timestamp);
        return sortDirection === 'asc' ? ta - tb : tb - ta;
      }

      const valueA = a[sortKey];
      const valueB = b[sortKey];
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });

    return data;
  }, [items, sortDirection, sortKey]);

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
      ['timestamp', 'temperature', 'humidity', 'soilMoisture', 'sensor'],
      ...pageItems.map((row) => [
        row.timestamp,
        row.temperature.toString(),
        row.humidity.toString(),
        row.soilMoisture.toString(),
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
        <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Alert color="failure">
            <span className="font-semibold">Unable to load sensor data.</span> {error}
          </Alert>
          <Button onClick={fetchTelemetry}>Retry</Button>
        </Card>
      );
    }

    if (!sortedItems.length) {
      return (
        <Alert color="info" className="rounded-3xl border border-slate-200 bg-white text-slate-700">
          No telemetry samples match the selected filters. Try adjusting the time range or limit.
        </Alert>
      );
    }

    return (
      <Card className="space-y-4 rounded-3xl border border-slate-200 shadow-sm">
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
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
            <Button color="light" size="xs" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                <TableHeadCell>Sensor</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {pageItems.map((item) => (
                <TableRow key={`${item.timestamp}-${item.sensor ?? 'default'}`}>
                  <TableCell className="whitespace-nowrap font-medium text-slate-900">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                  <TableCell>{item.temperature.toFixed(1)}</TableCell>
                  <TableCell>{item.humidity.toFixed(1)}</TableCell>
                  <TableCell>{item.soilMoisture.toFixed(1)}</TableCell>
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
              color="light"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              color="light"
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
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Sensor data</h1>
        <p className="text-sm text-slate-500">
          Explore raw telemetry samples with filters, sorting, and CSV export.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-1">
            <Label htmlFor="limit">Limit</Label>
            <Select
              id="limit"
              value={form.limit}
              onChange={(event) => setForm((prev) => ({ ...prev, limit: event.target.value }))}
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="from">From (ISO)</Label>
            <TextInput
              id="from"
              placeholder="2025-01-01T00:00:00Z"
              value={form.from}
              onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="to">To (ISO)</Label>
            <TextInput
              id="to"
              placeholder="2025-01-02T00:00:00Z"
              value={form.to}
              onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="sensor">Sensor</Label>
            <TextInput
              id="sensor"
              placeholder="sensor-id"
              value={form.sensor}
              onChange={(event) => setForm((prev) => ({ ...prev, sensor: event.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <Button className="flex-1" onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button color="light" className="flex-1" onClick={handleResetFilters}>
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
