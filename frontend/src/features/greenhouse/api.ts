import { api } from '../../shared/hooks/useApi'
import type { GreenhouseConfig } from './types'

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
  if (payload && 'ok' in payload && payload.ok) {
    return payload.data
  }

  const message =
    (payload as ErrorEnvelope)?.error?.message ??
    'Greenhouse request failed'
  throw new Error(message)
}

export const getCurrentGreenhouse = async (): Promise<GreenhouseConfig> => {
  const { data } = await api.get<Envelope<GreenhouseConfig>>('/greenhouses/current')
  return ensureOk(data)
}

export const updateCurrentGreenhouse = async (
  payload: GreenhouseConfig,
): Promise<GreenhouseConfig> => {
  const { data } = await api.put<Envelope<GreenhouseConfig>>('/greenhouses/current', payload)
  return ensureOk(data)
}
