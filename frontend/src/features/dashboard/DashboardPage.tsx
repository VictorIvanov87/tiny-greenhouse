import { Alert, Button, Card } from 'flowbite-react';
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertPanel } from '../alerts/AlertPanel';
import { useAlerts } from '../alerts/AlertsProvider';
import { sortByTimestamp } from '../telemetry/transforms';
import { useTelemetryQuery } from '../telemetry/api';
import { useControlSettingsQuery } from '../settings/controlSettingsApi';
import type { SetupProfile } from '../setup/state';
import { AlertBanner } from './components/AlertBanner';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { DevicesChart } from './components/DevicesChart';
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

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useTelemetryQuery({ limit: 100 });
  const error =
    queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const { data: controlSettings } = useControlSettingsQuery();

  const sortedSamples = useMemo(() => sortByTimestamp(data?.items ?? []), [data]);

  // Derive per-metric ranges from controlSettings (with sensible fallbacks for
  // metrics that aren't in controlSettings, e.g. light/pressure).
  const ranges = useMemo(
    () => ({
      temperature: {
        low: controlSettings?.thresholds.tempMinC ?? 18,
        high: controlSettings?.thresholds.tempMaxC ?? 26,
      },
      humidity: {
        low: controlSettings?.thresholds.humidityMinPct ?? 40,
        high: controlSettings?.thresholds.humidityMaxPct ?? 70,
      },
      soilMoisture: {
        low: controlSettings?.thresholds.soilMoisturePctMin ?? 40,
        high: controlSettings?.thresholds.soilMoisturePctMax ?? 60,
      },
      lightLux: { low: 0, high: 1000 },
      pressureHpa: { low: 950, high: 1050 },
    }),
    [controlSettings]
  );

  const latestSample = sortedSamples.at(-1);

  const criticalCount = active.filter((a) => a.severity === 'critical').length;
  const warnCount = active.filter((a) => a.severity === 'warn').length;

  const lastSeenMs = latestSample ? Date.now() - new Date(latestSample.timestamp).getTime() : null;
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
        waterLevelLow={latestSample?.waterLevelLow}
      />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card className="space-y-4 rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
          <Alert color="failure">
            <span className="font-medium">Unable to load telemetry.</span> {error}
          </Alert>
          <div>
            <Button color="gray" outline={true} onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
            <p className="text-sm font-semibold text-slate-100">Current readings</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <SensorCard
                label="Temperature"
                unit="°C"
                current={latestSample?.temperature ?? null}
                low={ranges.temperature.low}
                high={ranges.temperature.high}
              />
              <SensorCard
                label="Humidity"
                unit="%"
                current={latestSample?.humidity ?? null}
                low={ranges.humidity.low}
                high={ranges.humidity.high}
              />
              <SensorCard
                label="Soil moisture"
                unit="%"
                current={latestSample?.soilMoisture || null}
                low={ranges.soilMoisture.low}
                high={ranges.soilMoisture.high}
              />
              <SensorCard
                label="Light"
                unit=" lux"
                current={latestSample?.lightLux || null}
                low={ranges.lightLux.low}
                high={ranges.lightLux.high}
              />
            </div>
          </Card>

          <EnvironmentChart
            thresholds={{
              temp: ranges.temperature,
              humidity: ranges.humidity,
              soil: { low: ranges.soilMoisture.low },
            }}
          />

          <DevicesChart />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
            <AlertPanel />
            <RecentReadings items={sortedSamples} ranges={ranges} />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
