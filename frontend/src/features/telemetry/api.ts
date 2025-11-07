import { appConstants } from '../../shared/config/constants'
import { api } from '../../shared/hooks/useApi'

export type TelemetrySample = {
  timestamp: string
  temperature: number
  humidity: number
  soilMoisture: number
  lightHours?: number
  sensor?: string
}

export type TelemetryList = {
  items: TelemetrySample[]
  total: number
}

export type GetTelemetryParams = {
  limit?: number
  from?: string
  to?: string
  sensor?: string
}

export const getTelemetry = async (params: GetTelemetryParams = {}): Promise<TelemetryList> => {
  const { data } = await api.get<{ ok: boolean; data: TelemetryList }>('/telemetry', {
    params: {
      limit: params.limit ?? appConstants.TELEMETRY_DEFAULT_LIMIT,
      from: params.from,
      to: params.to,
      sensor: params.sensor,
    },
  })

  if (!data?.ok) {
    throw new Error('Telemetry request failed')
  }

  return data.data
}
