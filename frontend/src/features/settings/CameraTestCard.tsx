import { Alert, Badge, Button, Card, Label, Select, Spinner, TextInput } from 'flowbite-react'
import { useEffect, useMemo, useState } from 'react'
import { useDevicesQuery, type DeviceRecord } from './deviceTestApi'
import {
  useCameraSettingsQuery,
  useUpdateCameraSettingsMutation,
  type CameraFramesize,
  type CameraSettings,
} from './cameraSettingsApi'
import {
  useTestCaptureImage,
  useTestCaptureStatusQuery,
  useTriggerTestCaptureMutation,
} from './cameraTestApi'

const FRAMESIZE_OPTIONS: { value: CameraFramesize; label: string }[] = [
  { value: 'UXGA', label: 'UXGA (1600×1200) — best quality' },
  { value: 'SXGA', label: 'SXGA (1280×1024)' },
  { value: 'XGA', label: 'XGA (1024×768)' },
  { value: 'SVGA', label: 'SVGA (800×600)' },
  { value: 'VGA', label: 'VGA (640×480)' },
]

const SPECIAL_EFFECT_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Negative' },
  { value: 2, label: 'Grayscale' },
  { value: 3, label: 'Red tint' },
  { value: 4, label: 'Green tint' },
  { value: 5, label: 'Blue tint' },
  { value: 6, label: 'Sepia' },
]

const WB_MODE_OPTIONS = [
  { value: 0, label: 'Auto' },
  { value: 1, label: 'Sunny' },
  { value: 2, label: 'Cloudy' },
  { value: 3, label: 'Office' },
  { value: 4, label: 'Home' },
]

const num = (v: string): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type FieldProps = {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: string
  suffix?: string
  onChange: (v: number) => void
  disabled?: boolean
}

const Field = ({ id, label, value, min, max, step, suffix, onChange, disabled }: FieldProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs font-medium text-slate-400">
      {label}
      {suffix ? <span className="ml-1 text-slate-500">({suffix})</span> : null}
    </Label>
    <TextInput
      id={id}
      type="number"
      step={step ?? '1'}
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

const TestCaptureSection = ({ cams }: { cams: DeviceRecord[] }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [lightsOff, setLightsOff] = useState(true)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lightsApplied, setLightsApplied] = useState<boolean | null>(null)

  useEffect(() => {
    if (cams.length === 0) {
      setSelectedDeviceId(null)
      return
    }
    if (!selectedDeviceId || !cams.some((c) => c.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(cams[0].deviceId)
    }
  }, [cams, selectedDeviceId])

  // Reset any in-flight test when the user changes camera.
  useEffect(() => {
    setRequestId(null)
    setErrorMsg(null)
    setLightsApplied(null)
  }, [selectedDeviceId])

  const triggerMutation = useTriggerTestCaptureMutation(selectedDeviceId)
  const statusQuery = useTestCaptureStatusQuery(requestId)
  const status = statusQuery.data?.status
  const { url: imageUrl, error: imageError } = useTestCaptureImage(requestId, status)

  const handleTrigger = async () => {
    if (!selectedDeviceId) return
    setErrorMsg(null)
    try {
      const result = await triggerMutation.mutateAsync({ lightsOff })
      setRequestId(result.requestId)
      setLightsApplied(result.lightsOffApplied)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Test capture failed')
    }
  }

  const captureInFlight = !!requestId && status !== 'ready' && status !== 'expired'

  return (
    <div className="space-y-3 rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Take test picture</h3>
        {lightsApplied === false && (
          <Badge color="warning" size="xs">
            No main controller — lights stayed on
          </Badge>
        )}
      </div>

      {cams.length > 1 && (
        <div>
          <Label htmlFor="camPicker" className="mb-1 block text-xs font-medium text-slate-400">
            Camera
          </Label>
          <Select
            id="camPicker"
            value={selectedDeviceId ?? ''}
            onChange={(e) => setSelectedDeviceId(e.target.value || null)}
          >
            {cams.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.name} ({c.deviceId})
              </option>
            ))}
          </Select>
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={lightsOff}
          disabled={captureInFlight}
          onChange={(e) => setLightsOff(e.target.checked)}
        />
        <span
          className="peer relative h-6 w-11 rounded-full bg-gray-700
            after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5
            after:rounded-full after:border after:border-gray-600 after:bg-white
            after:transition-all after:content-['']
            peer-checked:bg-green-600 peer-checked:after:translate-x-full
            peer-checked:after:border-white peer-focus:outline-none
            peer-focus:ring-4 peer-focus:ring-green-800"
        />
        Turn off lights during capture
      </label>

      <div>
        <Button
          color="green"
          outline={true}
          onClick={handleTrigger}
          disabled={!selectedDeviceId || captureInFlight}
        >
          {captureInFlight ? 'Capturing…' : 'Take test picture'}
        </Button>
      </div>

      {errorMsg && (
        <Alert color="failure">
          <span className="font-semibold">Couldn&apos;t trigger test.</span> {errorMsg}
        </Alert>
      )}

      {requestId && (
        <div className="rounded-xl border border-[#1f2a3d] bg-[#111c2d] p-3">
          {status === 'pending' && (
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Spinner size="sm" />
              <span>
                Waiting for camera{lightsApplied ? ' (lights off ~10s, then capture)' : ''}…
              </span>
            </div>
          )}
          {status === 'expired' && (
            <Alert color="warning">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">No response.</span> The camera may be offline.
                </div>
                <Button color="gray" outline={true} size="xs" onClick={handleTrigger}>
                  Try again
                </Button>
              </div>
            </Alert>
          )}
          {status === 'ready' && (
            <div className="space-y-2">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Test capture"
                  className="w-full rounded-xl border border-[#1f2a3d]"
                />
              ) : imageError ? (
                <Alert color="failure">Could not load image: {imageError.message}</Alert>
              ) : (
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Spinner size="sm" />
                  <span>Loading image…</span>
                </div>
              )}
              {statusQuery.data?.capturedAt && (
                <p className="text-xs text-slate-500">
                  Captured at {new Date(statusQuery.data.capturedAt).toLocaleString()} ·{' '}
                  {statusQuery.data.sizeBytes
                    ? `${Math.round(statusQuery.data.sizeBytes / 1024)} KB`
                    : '—'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SettingsForm = () => {
  const query = useCameraSettingsQuery()
  const mutation = useUpdateCameraSettingsMutation()
  const [draft, setDraft] = useState<CameraSettings | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(query.data), [draft, query.data])
  const saving = mutation.isPending
  const saveError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
      ? String(mutation.error)
      : null

  const handleSave = async () => {
    if (!draft) return
    setSavedFlash(false)
    try {
      await mutation.mutateAsync(draft)
      setSavedFlash(true)
    } catch {
      // shown via mutation.error
    }
  }

  const handleReset = () => {
    if (query.data) setDraft(query.data)
    setSavedFlash(false)
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[6rem] items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (query.error || !draft) {
    return (
      <Alert color="failure">
        <span className="font-semibold">Couldn&apos;t load camera settings.</span>{' '}
        {query.error instanceof Error ? query.error.message : ''}
      </Alert>
    )
  }

  const set = (patch: Partial<CameraSettings>) => setDraft({ ...draft, ...patch })

  return (
    <div className="space-y-3">
      {savedFlash && !dirty && (
        <Alert color="success">
          Camera settings saved and pushed to device. Current version: {draft.version}
        </Alert>
      )}
      {saveError && (
        <Alert color="failure">
          <span className="font-semibold">Save failed.</span> {saveError}
        </Alert>
      )}

      <Section title="Image">
        <Field
          id="brightness"
          label="Brightness"
          min={-2}
          max={2}
          value={draft.brightness}
          onChange={(v) => set({ brightness: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="contrast"
          label="Contrast"
          min={-2}
          max={2}
          value={draft.contrast}
          onChange={(v) => set({ contrast: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="saturation"
          label="Saturation"
          min={-2}
          max={2}
          value={draft.saturation}
          onChange={(v) => set({ saturation: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="sharpness"
          label="Sharpness"
          min={-2}
          max={3}
          value={draft.sharpness}
          onChange={(v) => set({ sharpness: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="denoise"
          label="Denoise"
          min={0}
          max={1}
          value={draft.denoise}
          onChange={(v) => set({ denoise: Math.round(v) })}
          disabled={saving}
        />
      </Section>

      <Section title="White balance & exposure">
        <Field
          id="whitebal"
          label="Auto white balance"
          min={0}
          max={1}
          value={draft.whitebal}
          onChange={(v) => set({ whitebal: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="awbGain"
          label="AWB gain"
          min={0}
          max={1}
          value={draft.awbGain}
          onChange={(v) => set({ awbGain: Math.round(v) })}
          disabled={saving}
        />
        <div className="space-y-1">
          <Label htmlFor="wbMode" className="text-xs font-medium text-slate-400">
            White balance mode
          </Label>
          <Select
            id="wbMode"
            value={String(draft.wbMode)}
            onChange={(e) => set({ wbMode: Number(e.target.value) })}
            disabled={saving}
          >
            {WB_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <Field
          id="exposureCtrl"
          label="Auto exposure"
          min={0}
          max={1}
          value={draft.exposureCtrl}
          onChange={(v) => set({ exposureCtrl: Math.round(v) })}
          disabled={saving}
        />
        <Field
          id="gainCtrl"
          label="Auto gain"
          min={0}
          max={1}
          value={draft.gainCtrl}
          onChange={(v) => set({ gainCtrl: Math.round(v) })}
          disabled={saving}
        />
        <div className="space-y-1">
          <Label htmlFor="specialEffect" className="text-xs font-medium text-slate-400">
            Special effect
          </Label>
          <Select
            id="specialEffect"
            value={String(draft.specialEffect)}
            onChange={(e) => set({ specialEffect: Number(e.target.value) })}
            disabled={saving}
          >
            {SPECIAL_EFFECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </Section>

      <Section title="Encoding">
        <div className="space-y-1">
          <Label htmlFor="framesize" className="text-xs font-medium text-slate-400">
            Frame size
          </Label>
          <Select
            id="framesize"
            value={draft.framesize}
            onChange={(e) => set({ framesize: e.target.value as CameraFramesize })}
            disabled={saving}
          >
            {FRAMESIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <Field
          id="jpegQuality"
          label="JPEG quality"
          suffix="lower = better"
          min={4}
          max={40}
          value={draft.jpegQuality}
          onChange={(v) => set({ jpegQuality: Math.max(4, Math.min(40, Math.round(v))) })}
          disabled={saving}
        />
      </Section>

      <p className="text-xs text-slate-500">
        Saved settings apply to the next test capture and to the daily timelapse picture.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button color="green" outline={true} onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </Button>
        <Button color="gray" outline={true} onClick={handleReset} disabled={saving || !dirty}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export const CameraTestCard = () => {
  const devicesQuery = useDevicesQuery()
  const cams = useMemo(
    () => (devicesQuery.data ?? []).filter((d) => d.type === 'esp32-cam'),
    [devicesQuery.data],
  )

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Test camera</h2>
          <p className="text-xs text-slate-400">
            Take a one-off test picture without storing it, and tune the camera sensor settings
            used for both test shots and the daily timelapse picture.
          </p>
        </div>

        {devicesQuery.isLoading ? (
          <div className="flex min-h-[6rem] items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : cams.length === 0 ? (
          <Alert color="warning">
            No camera registered yet. Register an ESP32-CAM (type <code>esp32-cam</code>) before
            running this section.
          </Alert>
        ) : (
          <TestCaptureSection cams={cams} />
        )}

        <SettingsForm />
      </div>
    </Card>
  )
}
