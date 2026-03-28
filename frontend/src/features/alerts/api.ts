import { api } from '../../shared/hooks/useApi'

export type AlertType = 'SOIL_MOISTURE_LOW' | 'TEMP_HIGH' | 'SENSOR_STALE'
export type AlertSeverity = 'info' | 'warn' | 'critical'

export type Alert = {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  startedAt: string
  sensor?: string
  value?: number
  threshold?: number
}

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { code?: string; message?: string } }

const ensureOk = <T>(payload: Envelope<T>): T => {
  if ('ok' in payload && payload.ok) {
    return payload.data
  }

  const message = payload?.error?.message ?? 'Alerts request failed'
  throw new Error(message)
}

export const getActiveAlerts = async (): Promise<Alert[]> => {
  const { data } = await api.get<Envelope<{ items: Alert[]; total: number }>>('/alerts')
  return ensureOk(data).items
}


