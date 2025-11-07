import { Alert, Button, Card, Spinner } from 'flowbite-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getTelemetry, type TelemetrySample } from '../telemetry/api'
import type { SetupProfile } from '../setup/state'
import { KpiCards, type TelemetryMetrics } from './components/KpiCards'
import { RecentTelemetry } from './components/RecentTelemetry'

type DashboardContext = {
  profile: SetupProfile
}

const greetingByPlant = (plantType?: string) => {
  if (!plantType) {
    return 'Welcome back'
  }

  return `Welcome back, ${plantType.replace(/-/g, ' ')} caretaker`
}

const DashboardPage = () => {
  const { profile } = useOutletContext<DashboardContext>()
  const [samples, setSamples] = useState<TelemetrySample[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(false)

  const fetchTelemetry = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getTelemetry({ limit: 25 })

      if (!isMounted.current) {
        return
      }

      setSamples(result.items)
      setTotal(result.total)
    } catch (err) {
      if (!isMounted.current) {
        return
      }

      const message = err instanceof Error ? err.message : 'Failed to load telemetry'
      setError(message)
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchTelemetry()

    return () => {
      isMounted.current = false
    }
  }, [fetchTelemetry])

  const metrics = useMemo<TelemetryMetrics>(() => {
    if (!samples.length) {
      return {
        avgTemperature: null,
        avgHumidity: null,
        latestSoilMoisture: null,
      }
    }

    const average = (values: number[]) => {
      if (!values.length) {
        return null
      }

      const sum = values.reduce((acc, value) => acc + value, 0)
      return sum / values.length
    }

    const latest = [...samples].sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0]

    return {
      avgTemperature: average(samples.map((sample) => sample.temperature)),
      avgHumidity: average(samples.map((sample) => sample.humidity)),
      latestSoilMoisture: latest?.soilMoisture ?? null,
    }
  }, [samples])

  const renderContent = () => {
    if (loading) {
      return (
        <Card className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 shadow-sm">
          <Spinner size="xl" />
        </Card>
      )
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
      )
    }

    return (
      <div className="space-y-6">
        <KpiCards metrics={metrics} />
        <RecentTelemetry items={samples} total={total} />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
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
  )
}

export default DashboardPage
