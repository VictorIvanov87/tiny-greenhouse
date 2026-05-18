import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'

export type DeviceRecord = {
  deviceId: string
  ownerId: string
  greenhouseId: string
  type: 'esp32-main' | 'esp32-cam'
  name: string
  registeredAt: string
}

export type DeviceTestTarget = 'lights' | 'pump' | 'fan'
export type DeviceTestState = 'on' | 'off'

export type DeviceTestRequest = {
  device: DeviceTestTarget
  state: DeviceTestState
  durationSec?: number
}

export type DeviceTestResult = {
  deviceId: string
  device: DeviceTestTarget
  state: DeviceTestState
  expiresAt: string
}

const DEVICES_KEY = ['devices'] as const

const getDevices = async (): Promise<DeviceRecord[]> => {
  const { data } = await api.get<{
    ok: boolean
    data: { items: DeviceRecord[]; total: number }
  }>('/devices')
  if (!data?.ok) throw new Error('Failed to load devices')
  return data.data.items
}

export const useDevicesQuery = () =>
  useQuery({
    queryKey: DEVICES_KEY,
    queryFn: getDevices,
  })

export const useDeviceTestMutation = (deviceId: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: DeviceTestRequest): Promise<DeviceTestResult> => {
      if (!deviceId) throw new Error('No device selected')
      const { data } = await api.post<{ ok: boolean; data: DeviceTestResult }>(
        `/devices/${encodeURIComponent(deviceId)}/test-override`,
        body,
      )
      if (!data?.ok) throw new Error('Override request failed')
      return data.data
    },
    onSuccess: () => {
      // Telemetry will reflect new state once the next sample arrives.
      queryClient.invalidateQueries({ queryKey: ['telemetry'] })
    },
  })
}
