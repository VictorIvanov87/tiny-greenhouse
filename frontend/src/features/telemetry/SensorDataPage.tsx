import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Datepicker,
  Label,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from 'flowbite-react';
import { useTelemetryQuery } from './api';

const CARD_CLASS =
  'rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]';

type SortKey =
  | 'timestamp'
  | 'temperature'
  | 'humidity'
  | 'soilMoisture'
  | 'lightLux'
  | 'pressureHpa';
type SortDirection = 'asc' | 'desc' | null;

type MetricKey = 'temperature' | 'humidity' | 'soilMoisture' | 'lightLux' | 'pressureHpa';

const METRIC_OPTIONS: { value: MetricKey | ''; label: string }[] = [
  { value: '', label: 'All metrics' },
  { value: 'temperature', label: 'Temperature (°C)' },
  { value: 'humidity', label: 'Humidity (%)' },
  { value: 'soilMoisture', label: 'Soil moisture (%)' },
  { value: 'lightLux', label: 'Light (lux)' },
  { value: 'pressureHpa', label: 'Pressure (hPa)' },
];

type FormState = {
  from: string;
  to: string;
  metric: MetricKey | '';
};

const DEFAULT_FORM: FormState = {
  from: '',
  to: '',
  metric: '',
};

const PAGE_SIZE_OPTIONS = [25, 50] as const;

// Thresholds for color coding (must match dashboard components)
const RANGES = {
  temperature: { low: 18, high: 26 },
  humidity: { low: 40, high: 70 },
  soilMoisture: { low: 20, high: 80 },
  lightLux: { low: 0, high: 1000 },
  pressureHpa: { low: 950, high: 1050 },
};

const isInRange = (
  value: number | null | undefined,
  key: keyof typeof RANGES
): 'ok' | 'warn' | null => {
  if (value == null) return null;
  const { low, high } = RANGES[key];
  return value >= low && value <= high ? 'ok' : 'warn';
};

const VALUE_COLOR = {
  ok: '#34d399', // emerald-400
  warn: '#fb7185', // rose-400
};

const valueStyle = (
  value: number | null | undefined,
  key: keyof typeof RANGES
): React.CSSProperties => {
  const status = isInRange(value, key);
  return { color: status ? VALUE_COLOR[status] : '#94a3b8' };
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const toISOIfPresent = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
};

const dateToLocal = (date: Date, endOfDay = false): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T${endOfDay ? '23:59' : '00:00'}`;
};

const parseDate = (value: string): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const buildQueryParams = (state: FormState) => ({
  from: toISOIfPresent(state.from),
  to: toISOIfPresent(state.to),
});

const SensorDataPage = () => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [query, setQuery] = useState<FormState>(DEFAULT_FORM);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useTelemetryQuery(buildQueryParams(query));
  const total = data?.total ?? 0;
  const error =
    queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const showColumn = (key: MetricKey) => !form.metric || form.metric === key;

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

    const header = ['timestamp'];
    if (showColumn('temperature')) header.push('temperature');
    if (showColumn('humidity')) header.push('humidity');
    if (showColumn('soilMoisture')) header.push('soilMoisture');
    if (showColumn('lightLux')) header.push('lightLux');
    if (showColumn('pressureHpa')) header.push('pressureHpa');

    const rows = [
      header,
      ...pageItems.map((row) => {
        const cells = [row.timestamp];
        if (showColumn('temperature'))
          cells.push(row.temperature != null ? row.temperature.toString() : '');
        if (showColumn('humidity')) cells.push(row.humidity != null ? row.humidity.toString() : '');
        if (showColumn('soilMoisture')) cells.push(row.soilMoisture.toString());
        if (showColumn('lightLux')) cells.push(row.lightLux != null ? row.lightLux.toString() : '');
        if (showColumn('pressureHpa'))
          cells.push(row.pressureHpa != null ? row.pressureHpa.toString() : '');
        return cells;
      }),
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
          <Button color="gray" outline={true} onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      );
    }

    if (!sortedItems.length) {
      return (
        <Alert
          color="info"
          className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-300"
        >
          No telemetry samples match the selected filters. Try adjusting the date range.
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
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
            <Button color="gray" outline={true} onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto [&_table]:bg-transparent [&_thead]:bg-[#0b1220] [&_th]:text-slate-300 [&_td]:text-slate-300 [&_tr]:border-[#1f2a3d]">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>
                  <Button
                    color="gray"
                    outline={true}
                    className="!border-none !bg-transparent !p-0 !shadow-none"
                    onClick={() => toggleSort('timestamp')}
                  >
                    <span className="flex items-center text-sm font-semibold">
                      Time {renderSortIndicator('timestamp')}
                    </span>
                  </Button>
                </TableHeadCell>
                {showColumn('temperature') && (
                  <TableHeadCell>
                    <Button
                      color="gray"
                      outline={true}
                      className="!border-none !bg-transparent !p-0 !shadow-none"
                      onClick={() => toggleSort('temperature')}
                    >
                      <span className="flex items-center text-sm font-semibold">
                        Temperature (°C) {renderSortIndicator('temperature')}
                      </span>
                    </Button>
                  </TableHeadCell>
                )}
                {showColumn('humidity') && (
                  <TableHeadCell>
                    <Button
                      color="gray"
                      outline={true}
                      className="!border-none !bg-transparent !p-0 !shadow-none"
                      onClick={() => toggleSort('humidity')}
                    >
                      <span className="flex items-center text-sm font-semibold">
                        Humidity (%) {renderSortIndicator('humidity')}
                      </span>
                    </Button>
                  </TableHeadCell>
                )}
                {showColumn('soilMoisture') && (
                  <TableHeadCell>
                    <Button
                      color="gray"
                      outline={true}
                      className="!border-none !bg-transparent !p-0 !shadow-none"
                      onClick={() => toggleSort('soilMoisture')}
                    >
                      <span className="flex items-center text-sm font-semibold">
                        Soil moisture (%) {renderSortIndicator('soilMoisture')}
                      </span>
                    </Button>
                  </TableHeadCell>
                )}
                {showColumn('lightLux') && (
                  <TableHeadCell>
                    <Button
                      color="gray"
                      outline={true}
                      className="!border-none !bg-transparent !p-0 !shadow-none"
                      onClick={() => toggleSort('lightLux')}
                    >
                      <span className="flex items-center text-sm font-semibold">
                        Light (lux) {renderSortIndicator('lightLux')}
                      </span>
                    </Button>
                  </TableHeadCell>
                )}
                {showColumn('pressureHpa') && (
                  <TableHeadCell>
                    <Button
                      color="gray"
                      outline={true}
                      className="!border-none !bg-transparent !p-0 !shadow-none"
                      onClick={() => toggleSort('pressureHpa')}
                    >
                      <span className="flex items-center text-sm font-semibold">
                        Pressure (hPa) {renderSortIndicator('pressureHpa')}
                      </span>
                    </Button>
                  </TableHeadCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {pageItems.map((item) => (
                <TableRow key={`${item.timestamp}-${item.sensor ?? 'default'}`}>
                  <TableCell className="whitespace-nowrap font-medium text-slate-100">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                  {showColumn('temperature') && (
                    <TableCell style={valueStyle(item.temperature, 'temperature')}>
                      {item.temperature != null ? item.temperature.toFixed(1) : '—'}
                    </TableCell>
                  )}
                  {showColumn('humidity') && (
                    <TableCell style={valueStyle(item.humidity, 'humidity')}>
                      {item.humidity != null ? item.humidity.toFixed(1) : '—'}
                    </TableCell>
                  )}
                  {showColumn('soilMoisture') && (
                    <TableCell style={valueStyle(item.soilMoisture, 'soilMoisture')}>
                      {item.soilMoisture.toFixed(1)}
                    </TableCell>
                  )}
                  {showColumn('lightLux') && (
                    <TableCell style={valueStyle(item.lightLux, 'lightLux')}>
                      {item.lightLux != null ? item.lightLux.toFixed(1) : '—'}
                    </TableCell>
                  )}
                  {showColumn('pressureHpa') && (
                    <TableCell style={valueStyle(item.pressureHpa, 'pressureHpa')}>
                      {item.pressureHpa != null ? item.pressureHpa.toFixed(1) : '—'}
                    </TableCell>
                  )}
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
              outline={true}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              color="gray"
              outline={true}
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
          <div className="min-w-0 flex-1">
            <Label htmlFor="from" className="mb-1 text-xs text-slate-400">
              From
            </Label>
            <Datepicker
              id="from"
              value={parseDate(form.from)}
              onChange={(date) =>
                setForm((prev) => ({ ...prev, from: date ? dateToLocal(date) : '' }))
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="to" className="mb-1 text-xs text-slate-400">
              To
            </Label>
            <Datepicker
              id="to"
              value={parseDate(form.to)}
              onChange={(date) =>
                setForm((prev) => ({ ...prev, to: date ? dateToLocal(date, true) : '' }))
              }
            />
          </div>
          <div className="w-44">
            <Label htmlFor="metric" className="mb-1 text-xs text-slate-400">
              Metric
            </Label>
            <Select
              id="metric"
              value={form.metric}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, metric: event.target.value as MetricKey | '' }))
              }
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button color="green" outline={true} onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button color="red" outline={true} onClick={handleResetFilters}>
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
