import { Alert, Badge, Button, Card, Label, Select, Spinner } from 'flowbite-react'
import { useEffect, useMemo, useState } from 'react'
import { useTelemetryQuery, type TelemetrySample } from '../telemetry/api'
import {
  useDevicesQuery,
  useDeviceTestMutation,
  type DeviceTestState,
  type DeviceTestTarget,
} from './deviceTestApi'

const TEST_DURATION_SEC = 10

type Row = {
  key: DeviceTestTarget
  label: string
  description: string
  read: (s: TelemetrySample) => boolean | undefined
}

const ROWS: Row[] = [
  {
    key: 'lights',
    label: 'Grow lights',
    description: 'Verify the relay drives the lights on/off.',
    read: (s) => s.lightsOn,
  },
  {
    key: 'fan',
    label: 'Fan',
    description: 'Verify ventilation fan power and airflow.',
    read: (s) => s.fanOn,
  },
  {
    key: 'pump',
    label: 'Water pump',
    description:
      'Verify pump priming. The test is silently refused when the reservoir is low to protect the pump.',
    read: (s) => s.pumpOn,
  },
]

type ActiveTest = {
  device: DeviceTestTarget
  state: DeviceTestState
  expiresAtMs: number
}

const formatClock = (iso: string): string => {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

const formatRelative = (iso: string): string => {
  try {
    const ageMs = Date.now() - Date.parse(iso)
    if (Number.isNaN(ageMs) || ageMs < 0) return formatClock(iso)
    const mins = Math.round(ageMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.round(mins / 60)
    return `${hours} h ago`
  } catch {
    return '—'
  }
}

export const DeviceTestCard = () => {
  const devicesQuery = useDevicesQuery()
  const devices = useMemo(
    () => (devicesQuery.data ?? []).filter((d) => d.type === 'esp32-main'),
    [devicesQuery.data],
  )
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // Default the picker to the first device whenever the list resolves/changes.
  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDeviceId(null)
      return
    }
    if (!selectedDeviceId || !devices.some((d) => d.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].deviceId)
    }
  }, [devices, selectedDeviceId])

  const telemetryQuery = useTelemetryQuery({
    sensor: selectedDeviceId ?? undefined,
    limit: 1,
  })
  const latestSample = telemetryQuery.data?.items?.at(-1)

  const mutation = useDeviceTestMutation(selectedDeviceId)
  const [active, setActive] = useState<ActiveTest | null>(null)
  const [tick, setTick] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Drive the countdown clock; no-op when nothing is active.
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [active])

  // Clear when expired.
  useEffect(() => {
    if (!active) return
    if (Date.now() >= active.expiresAtMs) {
      setActive(null)
      // Force a refetch — telemetry should re-report state next sample.
      telemetryQuery.refetch()
    }
  }, [active, tick, telemetryQuery])

  // Reset selection on device change.
  useEffect(() => {
    setActive(null)
    setErrorMsg(null)
  }, [selectedDeviceId])

  const handleTest = async (device: DeviceTestTarget, state: DeviceTestState) => {
    if (!selectedDeviceId) return
    setErrorMsg(null)
    try {
      const result = await mutation.mutateAsync({
        device,
        state,
        durationSec: TEST_DURATION_SEC,
      })
      setActive({
        device,
        state,
        expiresAtMs: Date.parse(result.expiresAt),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed'
      setErrorMsg(message)
    }
  }

  const remainingSec = useMemo(() => {
    if (!active) return 0
    return Math.max(0, Math.ceil((active.expiresAtMs - Date.now()) / 1000))
    // tick re-renders this component every second when active is set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tick])

  if (devicesQuery.isLoading) {
    return (
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="flex min-h-[10rem] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Test devices</h2>
          <p className="text-xs text-slate-400">
            Verify each actuator is wired and responsive. Each test holds the new state for{' '}
            {TEST_DURATION_SEC} seconds, then the device returns to its normal schedule. Saved
            schedules are not changed.
          </p>
        </div>

        {devicesQuery.error && (
          <Alert color="failure">
            <span className="font-semibold">Couldn&apos;t load devices.</span>{' '}
            {devicesQuery.error instanceof Error ? devicesQuery.error.message : ''}
          </Alert>
        )}

        {devices.length === 0 ? (
          <Alert color="warning">
            No controller registered yet. Run the setup wizard to register an ESP32 controller
            before testing.
          </Alert>
        ) : (
          <>
            {devices.length > 1 && (
              <div className="rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4">
                <Label
                  htmlFor="deviceTestPicker"
                  className="mb-1 block text-xs font-medium text-slate-400"
                >
                  Device
                </Label>
                <Select
                  id="deviceTestPicker"
                  value={selectedDeviceId ?? ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.name} ({d.deviceId})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {errorMsg && (
              <Alert color="failure">
                <span className="font-semibold">Test failed.</span> {errorMsg}
              </Alert>
            )}

            {latestSample?.clockSynced === false && (
              <Alert color="warning">
                <span className="font-semibold">Device clock not synced.</span>{' '}
                Manual overrides are silently ignored until NTP recovers — try again in a
                minute, or reboot the device if this persists.
              </Alert>
            )}

            {latestSample?.waterLevelLow && (
              <Alert color="warning">
                <span className="font-semibold">Reservoir reported low.</span> The pump
                test will be refused by the firmware until the float switch reads water
                present.
              </Alert>
            )}

            <div className="rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4">
              <p className="mb-3 text-xs text-slate-500">
                {telemetryQuery.isFetching ? (
                  <span>Loading current state…</span>
                ) : latestSample ? (
                  <span>
                    Status as of{' '}
                    <span className="text-slate-300">{formatClock(latestSample.timestamp)}</span> (
                    {formatRelative(latestSample.timestamp)})
                  </span>
                ) : (
                  <span>No telemetry reported yet.</span>
                )}
              </p>

              <div className="space-y-3">
                {ROWS.map((row) => {
                  const reported = latestSample ? row.read(latestSample) : undefined
                  const isActiveRow = active?.device === row.key
                  const isPending = mutation.isPending && mutation.variables?.device === row.key
                  const disableRow = !selectedDeviceId || isPending || isActiveRow

                  return (
                    <div
                      key={row.key}
                      className="flex flex-col gap-3 rounded-xl border border-[#1f2a3d] bg-[#111c2d] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {row.label}
                            </span>
                            {reported === undefined ? (
                              <Badge color="gray" size="xs">
                                unknown
                              </Badge>
                            ) : reported ? (
                              <Badge color="success" size="xs">
                                ON
                              </Badge>
                            ) : (
                              <Badge color="gray" size="xs">
                                OFF
                              </Badge>
                            )}
                            {isActiveRow && (
                              <Badge color="warning" size="xs">
                                Test {active.state.toUpperCase()} · {remainingSec}s
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{row.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="xs"
                          color="green"
                          outline={true}
                          disabled={disableRow}
                          onClick={() => handleTest(row.key, 'on')}
                        >
                          Test ON {TEST_DURATION_SEC}s
                        </Button>
                        <Button
                          size="xs"
                          color="gray"
                          outline={true}
                          disabled={disableRow}
                          onClick={() => handleTest(row.key, 'off')}
                        >
                          Test OFF {TEST_DURATION_SEC}s
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
