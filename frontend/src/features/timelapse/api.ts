import { api } from '../../shared/hooks/useApi'

export type TimelapseFrame = {
  id: string
  greenhouseId: string
  timestamp: string
  url: string
}

export type TimelapseList = {
  items: TimelapseFrame[]
  total: number
}

export type GetTimelapseParams = {
  limit?: number
  from?: string
  to?: string
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

  const message = payload?.error?.message ?? 'Timelapse request failed'
  throw new Error(message)
}

export const getTimelapse = async (params: GetTimelapseParams = {}): Promise<TimelapseList> => {
  const { data } = await api.get<Envelope<TimelapseList>>('/timelapse', {
    params: {
      limit: params.limit ?? 50,
      from: params.from,
      to: params.to,
    },
  })

  return ensureOk(data)
}
