import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'

export type TelemetrySample = {
  timestamp: string
  temperature: number | null
  humidity: number | null
  soilMoisture: number
  lightLux?: number | null
  pressureHpa?: number | null
  lightHours?: number
  sensor?: string
  pumpOn?: boolean
  lightsOn?: boolean
  fanOn?: boolean
  waterLevelLow?: boolean
  sensorError?: boolean
  clockSynced?: boolean
  pumpTriggerPct?: number | null
}

export type TelemetryList = {
  items: TelemetrySample[]
  total: number
}

export type GetTelemetryParams = {
  from?: string
  to?: string
  limit?: number
  sensor?: string
}

export const getTelemetry = async (params: GetTelemetryParams = {}): Promise<TelemetryList> => {
  const { data } = await api.get<{ ok: boolean; data: TelemetryList }>('/telemetry', {
    params: {
      from: params.from,
      to: params.to,
      limit: params.limit,
      sensor: params.sensor,
    },
  })

  if (!data?.ok) {
    throw new Error('Telemetry request failed')
  }

  return data.data
}

// ---------------------------------------------------------------------------
// React Query
// ---------------------------------------------------------------------------

export const telemetryKeys = {
  all: ['telemetry'] as const,
  list: (params: GetTelemetryParams) => ['telemetry', 'list', params] as const,
}

export const useTelemetryQuery = (params: GetTelemetryParams = {}) => {
  return useQuery({
    queryKey: telemetryKeys.list(params),
    queryFn: () => getTelemetry(params),
  })
}
