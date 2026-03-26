import { Alert, Button, Card, Spinner } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../../shared/ui/ChartCard';
import { AlertPanel } from '../alerts/AlertPanel';
import {
  bucketByMinute,
  filterByWindow,
  sortByTimestamp,
  type WindowKey,
} from '../telemetry/transforms';
import { getTelemetry, type TelemetrySample } from '../telemetry/api';
import type { SetupProfile } from '../setup/state';
import { KpiCards, type TelemetryMetrics } from './components/KpiCards';
import { RecentTelemetry } from './components/RecentTelemetry';

type DashboardContext = {
  profile: SetupProfile;
};

const WINDOW_OPTIONS: WindowKey[] = ['1h', '6h', '24h'];

const greetingByPlant = (plantType?: string) => {
  if (!plantType) {
    return 'Welcome back';
  }

  return `Welcome back, ${plantType.replace(/-/g, ' ')} caretaker`;
};

const formatTick = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const DashboardPage = () => {
  const { profile } = useOutletContext<DashboardContext>();
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<WindowKey>('6h');
  const isMounted = useRef(false);

  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTelemetry({ limit: 100 });

      if (!isMounted.current) {
        return;
      }

      setSamples(result.items);
      setTotal(result.total);
    } catch (err) {
      if (!isMounted.current) {
        return;
      }

      const message = err instanceof Error ? err.message : 'Failed to load telemetry';
      setError(message);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchTelemetry();

    return () => {
      isMounted.current = false;
    };
  }, [fetchTelemetry]);

  const sortedSamples = useMemo(() => sortByTimestamp(samples), [samples]);

  const recentSamples = useMemo(() => sortedSamples.slice(-25), [sortedSamples]);
  const windowedSamples = useMemo(
    () => filterByWindow(sortedSamples, timeWindow),
    [sortedSamples, timeWindow]
  );

  const chartSeries = useMemo(() => {
    const temperature = bucketByMinute(windowedSamples, (sample) => sample.temperature);
    const humidity = bucketByMinute(windowedSamples, (sample) => sample.humidity);
    const soilMoisture = bucketByMinute(windowedSamples, (sample) => sample.soilMoisture);
    return { temperature, humidity, soilMoisture };
  }, [windowedSamples]);

  const summarizeSeries = (series: Array<{ value: number }>) => {
    if (!series.length) {
      return { start: null, current: null, avg: null, delta: null };
    }
    const start = series[0].value;
    const current = series[series.length - 1].value;
    const avg = series.reduce((acc, item) => acc + item.value, 0) / series.length;
    return {
      start,
      current,
      avg,
      delta: current - start,
    };
  };

  const metrics = useMemo<TelemetryMetrics>(() => {
    const temperature = summarizeSeries(chartSeries.temperature);
    const humidity = summarizeSeries(chartSeries.humidity);
    const soilMoisture = summarizeSeries(chartSeries.soilMoisture);

    return {
      temperature: { ...temperature, label: 'Temperature', unit: '°C' },
      humidity: { ...humidity, label: 'Humidity', unit: '%' },
      soilMoisture: { ...soilMoisture, label: 'Soil moisture', unit: '%' },
    };
  }, [chartSeries]);

  const renderAreaChart = (
    data: Array<{ timestamp: number; value: number }>,
    stroke: string,
    fill: string
  ) => {
    if (data.length === 0) {
      return null;
    }

    return (
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} responsive>
          <XAxis dataKey="timestamp" tickFormatter={formatTick} tickSize={6} fontSize={12} />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ fontSize: '0.75rem' }}
            labelFormatter={(value) => new Date(value as number).toLocaleString()}
            labelStyle={{ color: '#111827', fontWeight: '600' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={fill}
            fillOpacity={1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const TimeWindowSwitch = () => (
    <div
      className="inline-flex -space-x-px rounded-xl border border-slate-400 bg-slate-900/70 shadow-sm shadow-emerald-900/25"
      role="group"
      aria-label="Time window"
    >
      {WINDOW_OPTIONS.map((window, index) => {
        const isActive = window === timeWindow;
        const rounded =
          index === 0
            ? 'rounded-l-xl'
            : index === WINDOW_OPTIONS.length - 1
            ? 'rounded-r-xl'
            : 'rounded-none';
        return (
          <button
            key={window}
            type="button"
            onClick={() => setTimeWindow(window)}
            aria-pressed={isActive}
            className={`text-sm cursor-pointer font-semibold leading-5 px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${rounded} ${
              isActive
                ? 'z-10 bg-[#1F6F4A] rounded-xl border text-slate-100 shadow-[0_6px_22px_rgba(16,185,129,0.35)] ring-1 ring-emerald-300'
                : 'bg-transparent text-slate-200 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            {window}
          </button>
        );
      })}
    </div>
  );

  const chartGrid = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Environment trends</h2>
          <p className="text-xs text-slate-500">Filtered to the past {timeWindow}</p>
        </div>
        <TimeWindowSwitch />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ChartCard title="Temperature (°C)" isEmpty={chartSeries.temperature.length === 0}>
          {renderAreaChart(chartSeries.temperature, '#f97316', 'rgba(249,115,22,0.25)')}
        </ChartCard>
        <ChartCard title="Humidity (%)" isEmpty={chartSeries.humidity.length === 0}>
          {renderAreaChart(chartSeries.humidity, '#3b82f6', 'rgba(59,130,246,0.25)')}
        </ChartCard>
        <ChartCard title="Soil moisture (%)" isEmpty={chartSeries.soilMoisture.length === 0}>
          {renderAreaChart(chartSeries.soilMoisture, '#10b981', 'rgba(16,185,129,0.25)')}
        </ChartCard>
      </div>
    </section>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <Card className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 shadow-sm">
          <Spinner size="xl" />
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="space-y-4 rounded-3xl border border-slate-200 shadow-sm">
          <Alert color="failure">
            <span className="font-medium">Unable to load telemetry.</span> {error}
          </Alert>
          <div>
            <Button color="dark" onClick={() => fetchTelemetry()}>
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {chartGrid}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
          <div className="space-y-6">
            <KpiCards metrics={metrics} />
            <RecentTelemetry items={recentSamples} total={total} />
          </div>
          <AlertPanel />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <Card className="rounded-3xl mb-6 border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
            {greetingByPlant(profile.plantType)}
          </h1>
          <p className="text-sm text-slate-400">
            Here’s the latest snapshot of your greenhouse performance and captured moments.
          </p>
        </div>
      </Card>

      {renderContent()}
    </div>
  );
};

export default DashboardPage;
