import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'

export type CameraFramesize = 'UXGA' | 'SXGA' | 'XGA' | 'SVGA' | 'VGA'

export type CameraSettings = {
  version: number
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  denoise: number
  whitebal: number
  awbGain: number
  exposureCtrl: number
  gainCtrl: number
  specialEffect: number
  wbMode: number
  framesize: CameraFramesize
  jpegQuality: number
}

const QUERY_KEY = ['cameraSettings'] as const

const getCameraSettings = async (): Promise<CameraSettings> => {
  const { data } = await api.get<{ ok: boolean; data: CameraSettings }>('/camera-settings')
  if (!data?.ok) throw new Error('Failed to load camera settings')
  return data.data
}

const putCameraSettings = async (settings: CameraSettings): Promise<CameraSettings> => {
  const { data } = await api.put<{ ok: boolean; data: CameraSettings }>(
    '/camera-settings',
    settings,
  )
  if (!data?.ok) throw new Error('Failed to save camera settings')
  return data.data
}

export const useCameraSettingsQuery = () =>
  useQuery({ queryKey: QUERY_KEY, queryFn: getCameraSettings })

export const useUpdateCameraSettingsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: putCameraSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
    },
  })
}
