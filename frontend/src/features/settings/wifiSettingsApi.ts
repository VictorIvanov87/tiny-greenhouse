import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'

// The password is write-only on the backend, so it is never part of the fetched
// settings — only the currently-configured SSID and its version come back.
export type WiFiSettings = {
  version: number
  ssid: string
}

export type WiFiSettingsInput = {
  ssid: string
  password: string
}

const QUERY_KEY = ['wifiSettings'] as const

export const getWiFiSettings = async (): Promise<WiFiSettings> => {
  const { data } = await api.get<{ ok: boolean; data: WiFiSettings }>('/wifi-settings')
  if (!data?.ok) {
    throw new Error('Failed to load Wi-Fi settings')
  }
  return data.data
}

export const putWiFiSettings = async (input: WiFiSettingsInput): Promise<WiFiSettings> => {
  const { data } = await api.put<{
    ok: boolean
    data: WiFiSettings
    error?: { code: string; message: string }
  }>('/wifi-settings', input)
  if (!data?.ok) {
    throw new Error(data?.error?.message ?? 'Failed to save Wi-Fi settings')
  }
  return data.data
}

export const useWiFiSettingsQuery = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getWiFiSettings,
  })

export const useUpdateWiFiSettingsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: putWiFiSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
    },
  })
}
