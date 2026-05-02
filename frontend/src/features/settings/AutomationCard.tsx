import { Alert, Button, Card, Label, Spinner, TextInput } from 'flowbite-react'
import { useEffect, useState } from 'react'
import {
  useControlSettingsQuery,
  useUpdateControlSettingsMutation,
  type ControlSettings,
} from './controlSettingsApi'

const num = (v: string): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type FieldProps = {
  id: string
  label: string
  value: number
  step?: string
  min?: number
  max?: number
  suffix?: string
  onChange: (v: number) => void
  disabled?: boolean
}

const Field = ({ id, label, value, step, min, max, suffix, onChange, disabled }: FieldProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs font-medium text-slate-400">
      {label}
      {suffix ? <span className="ml-1 text-slate-500">({suffix})</span> : null}
    </Label>
    <TextInput
      id={id}
      type="number"
      step={step ?? 'any'}
      min={min}
      max={max}
      value={String(value)}
      onChange={(e) => onChange(num(e.target.value))}
      disabled={disabled}
    />
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4">
    <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
)

export const AutomationCard = () => {
  const query = useControlSettingsQuery()
  const mutation = useUpdateControlSettingsMutation()
  const [draft, setDraft] = useState<ControlSettings | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])

  const handleSave = async () => {
    if (!draft) return
    setSavedFlash(false)
    try {
      await mutation.mutateAsync(draft)
      setSavedFlash(true)
    } catch {
      // error surfaced via mutation.error below
    }
  }

  const handleReset = () => {
    if (query.data) setDraft(query.data)
    setSavedFlash(false)
  }

  if (query.isLoading) {
    return (
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="flex min-h-[10rem] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    )
  }

  if (query.error || !draft) {
    return (
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <Alert color="failure">
          <span className="font-semibold">Unable to load automation settings.</span>{' '}
          {query.error instanceof Error ? query.error.message : ''}
        </Alert>
        <Button color="gray" outline={true} onClick={() => query.refetch()} className="mt-3">
          Retry
        </Button>
      </Card>
    )
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(query.data)
  const saving = mutation.isPending
  const saveError =
    mutation.error instanceof Error ? mutation.error.message : mutation.error ? String(mutation.error) : null

  // Helpers to update nested fields immutably
  const setT = (patch: Partial<ControlSettings['thresholds']>) =>
    setDraft({ ...draft, thresholds: { ...draft.thresholds, ...patch } })
  const setL = (patch: Partial<ControlSettings['lights']>) =>
    setDraft({ ...draft, lights: { ...draft.lights, ...patch } })
  const setF = (patch: Partial<ControlSettings['fan']>) =>
    setDraft({ ...draft, fan: { ...draft.fan, ...patch } })
  const setP = (patch: Partial<ControlSettings['pump']>) =>
    setDraft({ ...draft, pump: { ...draft.pump, ...patch } })

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Automation</h2>
          <p className="text-xs text-slate-400">
            Thresholds, lights schedule, and fan/pump rules pushed to the device on save.
            Current version: {draft.version}
          </p>
        </div>

        {savedFlash && !dirty && (
          <Alert color="success">Settings saved and synced to device twin.</Alert>
        )}
        {saveError && (
          <Alert color="failure">
            <span className="font-semibold">Save failed.</span> {saveError}
          </Alert>
        )}

        <Section title="Thresholds">
          <Field
            id="tempMinC"
            label="Min temperature"
            suffix="°C"
            value={draft.thresholds.tempMinC}
            onChange={(v) => setT({ tempMinC: v })}
            disabled={saving}
          />
          <Field
            id="tempMaxC"
            label="Max temperature"
            suffix="°C"
            value={draft.thresholds.tempMaxC}
            onChange={(v) => setT({ tempMaxC: v })}
            disabled={saving}
          />
          <Field
            id="humidityMinPct"
            label="Min humidity"
            suffix="%"
            min={0}
            max={100}
            value={draft.thresholds.humidityMinPct}
            onChange={(v) => setT({ humidityMinPct: v })}
            disabled={saving}
          />
          <Field
            id="humidityMaxPct"
            label="Max humidity"
            suffix="%"
            min={0}
            max={100}
            value={draft.thresholds.humidityMaxPct}
            onChange={(v) => setT({ humidityMaxPct: v })}
            disabled={saving}
          />
          <Field
            id="soilMin"
            label="Soil moisture target — min"
            suffix="%"
            min={0}
            max={100}
            value={draft.thresholds.soilMoisturePctMin}
            onChange={(v) => setT({ soilMoisturePctMin: v })}
            disabled={saving}
          />
          <Field
            id="soilMax"
            label="Soil moisture target — max"
            suffix="%"
            min={0}
            max={100}
            value={draft.thresholds.soilMoisturePctMax}
            onChange={(v) => setT({ soilMoisturePctMax: v })}
            disabled={saving}
          />
        </Section>

        <Section title="Lights">
          <Field
            id="lightsStart"
            label="On at"
            suffix="hour 0–23"
            step="1"
            min={0}
            max={23}
            value={draft.lights.startHour}
            onChange={(v) => setL({ startHour: Math.round(v) })}
            disabled={saving}
          />
          <Field
            id="lightsEnd"
            label="Off at"
            suffix="hour 0–23"
            step="1"
            min={0}
            max={23}
            value={draft.lights.endHour}
            onChange={(v) => setL({ endHour: Math.round(v) })}
            disabled={saving}
          />
        </Section>

        <Section title="Fan">
          <Field
            id="fanEvery"
            label="Periodic interval"
            suffix="minutes"
            step="1"
            min={1}
            value={Math.round(draft.fan.periodicEverySec / 60)}
            onChange={(v) => setF({ periodicEverySec: Math.max(60, Math.round(v) * 60) })}
            disabled={saving}
          />
          <Field
            id="fanDuration"
            label="Periodic duration"
            suffix="minutes"
            step="1"
            min={1}
            value={Math.round(draft.fan.periodicDurationSec / 60)}
            onChange={(v) => setF({ periodicDurationSec: Math.max(60, Math.round(v) * 60) })}
            disabled={saving}
          />
          <Field
            id="fanHumidityOverride"
            label="Humidity override above"
            suffix="%"
            min={0}
            max={100}
            value={draft.fan.humidityOverridePct}
            onChange={(v) => setF({ humidityOverridePct: v })}
            disabled={saving}
          />
        </Section>

        <Section title="Pump">
          <Field
            id="pumpTrigger"
            label="Trigger when soil ≤"
            suffix="%"
            min={0}
            max={100}
            value={draft.pump.triggerPct}
            onChange={(v) => setP({ triggerPct: v })}
            disabled={saving}
          />
          <Field
            id="pumpDelay"
            label="Delay after measurement"
            suffix="seconds"
            step="1"
            min={0}
            value={draft.pump.delayAfterMeasurementSec}
            onChange={(v) => setP({ delayAfterMeasurementSec: Math.round(v) })}
            disabled={saving}
          />
          <Field
            id="pumpPulse"
            label="Pulse duration"
            suffix="seconds"
            step="1"
            min={1}
            value={draft.pump.pulseDurationSec}
            onChange={(v) => setP({ pulseDurationSec: Math.max(1, Math.round(v)) })}
            disabled={saving}
          />
          <Field
            id="pumpSettle"
            label="Settle window"
            suffix="minutes"
            step="1"
            min={0}
            value={Math.round(draft.pump.settleWindowSec / 60)}
            onChange={(v) => setP({ settleWindowSec: Math.max(0, Math.round(v) * 60) })}
            disabled={saving}
          />
          <Field
            id="pumpDailyCap"
            label="Max pulses per day"
            step="1"
            min={1}
            value={draft.pump.maxPulsesPerDay}
            onChange={(v) => setP({ maxPulsesPerDay: Math.max(1, Math.round(v)) })}
            disabled={saving}
          />
        </Section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button color="green" outline={true} onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </Button>
          <Button color="gray" outline={true} onClick={handleReset} disabled={saving || !dirty}>
            Reset
          </Button>
        </div>
      </div>
    </Card>
  )
}
