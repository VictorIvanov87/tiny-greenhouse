import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'

export type ControlSettings = {
  version: number
  thresholds: {
    tempMinC: number
    tempMaxC: number
    humidityMinPct: number
    humidityMaxPct: number
    soilMoisturePctMin: number
    soilMoisturePctMax: number
  }
  lights: {
    startHour: number
    endHour: number
  }
  fan: {
    periodicEverySec: number
    periodicDurationSec: number
    humidityOverridePct: number
  }
  pump: {
    triggerPct: number
    delayAfterMeasurementSec: number
    pulseDurationSec: number
    settleWindowSec: number
    maxPulsesPerDay: number
  }
}

const QUERY_KEY = ['controlSettings'] as const

export const getControlSettings = async (): Promise<ControlSettings> => {
  const { data } = await api.get<{ ok: boolean; data: ControlSettings }>('/control-settings')
  if (!data?.ok) {
    throw new Error('Failed to load control settings')
  }
  return data.data
}

export const putControlSettings = async (settings: ControlSettings): Promise<ControlSettings> => {
  const { data } = await api.put<{
    ok: boolean
    data: ControlSettings
    error?: { code: string; message: string }
  }>('/control-settings', settings)
  if (!data?.ok) {
    throw new Error(data?.error?.message ?? 'Failed to save control settings')
  }
  return data.data
}

export const useControlSettingsQuery = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getControlSettings,
  })

export const useUpdateControlSettingsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: putControlSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
    },
  })
}
