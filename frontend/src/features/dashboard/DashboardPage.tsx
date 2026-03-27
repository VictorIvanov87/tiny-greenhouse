import { Alert, Button, Card, Spinner } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertPanel } from '../alerts/AlertPanel';
import { useAlerts } from '../alerts/AlertsProvider';
import {
  bucketByMinute,
  filterByWindow,
  sortByTimestamp,
} from '../telemetry/transforms';
import { getTelemetry, type TelemetrySample } from '../telemetry/api';
import type { SetupProfile } from '../setup/state';
import { AlertBanner } from './components/AlertBanner';
import { EnvironmentChart } from './components/EnvironmentChart';
import { RecentReadings } from './components/RecentReadings';
import { SensorCard } from './components/SensorCard';
import { StatusRow } from './components/StatusRow';

type DashboardContext = {
  profile: SetupProfile;
};

const DashboardPage = () => {
  const { profile } = useOutletContext<DashboardContext>();
  const { active } = useAlerts();
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    } catch (err) {
      if (!isMounted.current) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to load telemetry');
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

  const sparklineSamples = useMemo(
    () => filterByWindow(sortedSamples, '2h'),
    [sortedSamples],
  );

  const sparklines = useMemo(
    () => ({
      temperature: bucketByMinute(sparklineSamples, (s) => s.temperature),
      humidity: bucketByMinute(sparklineSamples, (s) => s.humidity),
      soilMoisture: bucketByMinute(sparklineSamples, (s) => s.soilMoisture),
    }),
    [sparklineSamples],
  );

  const windowDelta = (series: Array<{ value: number }>) => {
    if (series.length < 2) return null;
    return series[series.length - 1].value - series[0].value;
  };

  const latestSample = sortedSamples.at(-1);

  const criticalCount = active.filter((a) => a.severity === 'critical').length;
  const warnCount = active.filter((a) => a.severity === 'warn').length;

  const lastSeenMs = latestSample
    ? Date.now() - new Date(latestSample.timestamp).getTime()
    : null;
  const lastSeenLabel = (() => {
    if (lastSeenMs === null) return null;
    if (lastSeenMs < 60_000) return 'Last reading: just now';
    const minutes = Math.floor(lastSeenMs / 60_000);
    if (minutes < 60) return `Last reading: ${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last reading: ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Last reading: ${days}d ago`;
  })();

  return (
    <div className="space-y-6">
      <AlertBanner />

      <StatusRow
        plantType={profile.plantType}
        lastSeenLabel={lastSeenLabel}
        criticalCount={criticalCount}
        warnCount={warnCount}
      />

      {loading ? (
        <Card className="flex min-h-[280px] items-center justify-center rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
          <Spinner size="xl" />
        </Card>
      ) : error ? (
        <Card className="space-y-4 rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
          <Alert color="failure">
            <span className="font-medium">Unable to load telemetry.</span> {error}
          </Alert>
          <div>
            <Button color="dark" onClick={() => fetchTelemetry()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SensorCard
              label="Temperature"
              unit="°C"
              current={latestSample?.temperature ?? null}
              sparklineData={sparklines.temperature}
              low={18}
              high={26}
              delta={windowDelta(sparklines.temperature)}
              targetLabel="Target 18–26 °C"
            />
            <SensorCard
              label="Humidity"
              unit="%"
              current={latestSample?.humidity ?? null}
              sparklineData={sparklines.humidity}
              low={40}
              high={70}
              delta={windowDelta(sparklines.humidity)}
              targetLabel="Target 40–70 %"
            />
            <SensorCard
              label="Soil moisture"
              unit="%"
              current={latestSample?.soilMoisture ?? null}
              sparklineData={sparklines.soilMoisture}
              low={20}
              high={100}
              delta={windowDelta(sparklines.soilMoisture)}
              targetLabel="Min 20 %"
            />
          </div>

          <EnvironmentChart />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
            <AlertPanel />
            <RecentReadings items={sortedSamples} />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
