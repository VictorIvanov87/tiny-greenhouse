import { api } from '../../shared/hooks/useApi'

export type AlertRuleMetric = 'temperature' | 'humidity' | 'soilMoisture' | 'lightLux'
export type AlertRuleCondition = 'above' | 'below'

export type AlertRule = {
  id: string
  metric: AlertRuleMetric
  condition: AlertRuleCondition
  value: number
  enabled: boolean
}

export type NotificationPrefs = {
  email: boolean
  push: boolean
  rules: AlertRule[]
}

type SuccessEnvelope<T> = {
  ok: true
  data: T
}

type ErrorEnvelope = {
  ok: false
  error?: {
    code?: string
    message?: string
  }
}

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope

const ensureOk = <T>(payload: Envelope<T>): T => {
  if ('ok' in payload && payload.ok) {
    return payload.data
  }

  const message = payload?.error?.message ?? 'Notification request failed'
  throw new Error(message)
}

export const getNotificationPrefs = async (): Promise<NotificationPrefs> => {
  const { data } = await api.get<Envelope<NotificationPrefs>>('/notifications')
  return ensureOk(data)
}

export const updateNotificationPrefs = async (
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> => {
  const { data } = await api.put<Envelope<NotificationPrefs>>('/notifications', prefs)
  return ensureOk(data)
}
