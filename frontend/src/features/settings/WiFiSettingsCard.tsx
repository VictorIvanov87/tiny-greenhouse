import { Alert, Button, Card, Label, Spinner, TextInput } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { useWiFiSettingsQuery, useUpdateWiFiSettingsMutation } from './wifiSettingsApi'

const SSID_MAX = 32
const PW_MIN = 8 // WPA2-PSK minimum
const PW_MAX = 63

const validate = (ssid: string, password: string): string[] => {
  const errors: string[] = []
  const s = ssid.trim()
  if (s.length < 1 || s.length > SSID_MAX)
    errors.push(`Network name (SSID) must be 1–${SSID_MAX} characters.`)
  if (password.length < PW_MIN || password.length > PW_MAX)
    errors.push(`Password must be ${PW_MIN}–${PW_MAX} characters.`)
  return errors
}

export const WiFiSettingsCard = () => {
  const query = useWiFiSettingsQuery()
  const mutation = useUpdateWiFiSettingsMutation()
  // ssid is seeded once from the fetched value; null means "not seeded yet".
  // The password always starts blank (the API never returns it).
  const [ssid, setSsid] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (query.data && ssid === null) setSsid(query.data.ssid)
  }, [query.data, ssid])

  const handleSave = async () => {
    if (ssid === null) return
    setSavedFlash(false)
    try {
      await mutation.mutateAsync({ ssid: ssid.trim(), password })
      setSavedFlash(true)
      setPassword('') // don't retain the credential in the DOM after saving
    } catch {
      // error surfaced via mutation.error below
    }
  }

  if (query.isLoading || ssid === null) {
    return (
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="flex min-h-[10rem] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    )
  }

  if (query.error) {
    return (
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <Alert color="failure">
          <span className="font-semibold">Unable to load Wi-Fi settings.</span>{' '}
          {query.error instanceof Error ? query.error.message : ''}
        </Alert>
        <Button color="gray" outline={true} onClick={() => query.refetch()} className="mt-3">
          Retry
        </Button>
      </Card>
    )
  }

  const saving = mutation.isPending
  const validationErrors = validate(ssid, password)
  const saveError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? String(mutation.error)
        : null
  const currentSsid = query.data?.ssid?.trim()

  return (
    <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Wi-Fi network</h2>
          <p className="text-xs text-slate-400">
            Currently configured:{' '}
            <span className="text-slate-200">{currentSsid ? currentSsid : 'device default (from firmware)'}</span>
            {query.data ? ` · v${query.data.version}` : ''}
          </p>
        </div>

        <Alert color="warning">
          <span className="font-semibold">Heads up.</span> Saving reboots both boards
          onto the new network. If the credentials are wrong they return to the current
          network automatically. Don&apos;t change this while relocating the greenhouse —
          set the new network while the devices are still connected to their current Wi-Fi.
        </Alert>

        {savedFlash && (
          <Alert color="success">
            New Wi-Fi pushed to the devices. They will reboot and reconnect shortly.
          </Alert>
        )}
        {validationErrors.length > 0 && (
          <Alert color="warning">
            <ul className="list-disc pl-4 space-y-0.5">
              {validationErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}
        {saveError && (
          <Alert color="failure">
            <span className="font-semibold">Save failed.</span> {saveError}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="wifi-ssid" className="text-xs font-medium text-slate-400">
              Network name (SSID)
            </Label>
            <TextInput
              id="wifi-ssid"
              autoComplete="off"
              value={ssid}
              maxLength={SSID_MAX}
              onChange={(e) => setSsid(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wifi-password" className="text-xs font-medium text-slate-400">
              Password
            </Label>
            <TextInput
              id="wifi-password"
              type="password"
              autoComplete="new-password"
              value={password}
              maxLength={PW_MAX}
              placeholder="Enter the network password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            color="green"
            outline={true}
            onClick={handleSave}
            disabled={saving || validationErrors.length > 0}
          >
            {saving ? 'Saving…' : 'Save & push to devices'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
