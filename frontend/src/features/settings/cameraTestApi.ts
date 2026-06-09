import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../shared/hooks/useApi'
import { appConstants } from '../../shared/config/constants'
import { auth } from '../auth/firebase'

export type TestCaptureTriggerResult = {
  requestId: string
  expiresAt: string
  lightsOffApplied: boolean
}

export type TestCaptureStatus = {
  requestId: string
  status: 'pending' | 'ready' | 'expired'
  imageUrl?: string
  capturedAt?: string
  sizeBytes?: number
}

export const useTriggerTestCaptureMutation = (deviceId: string | null) =>
  useMutation({
    mutationFn: async (body: { lightsOff?: boolean }): Promise<TestCaptureTriggerResult> => {
      if (!deviceId) throw new Error('No camera selected')
      const { data } = await api.post<{ ok: boolean; data: TestCaptureTriggerResult }>(
        `/cameras/${encodeURIComponent(deviceId)}/test-capture`,
        body,
      )
      if (!data?.ok) throw new Error('Failed to trigger test capture')
      return data.data
    },
  })

export const useTestCaptureStatusQuery = (requestId: string | null) =>
  useQuery({
    queryKey: ['cameraTestCapture', requestId],
    queryFn: async (): Promise<TestCaptureStatus> => {
      const { data } = await api.get<{ ok: boolean; data: TestCaptureStatus }>(
        `/cameras/test-capture/${encodeURIComponent(requestId!)}`,
      )
      if (!data?.ok) throw new Error('Status fetch failed')
      return data.data
    },
    enabled: !!requestId,
    refetchInterval: (q) => {
      if (q.state.status === 'error') return false
      const s = q.state.data?.status
      return s === 'ready' || s === 'expired' ? false : 2000
    },
  })

/**
 * Fetches a ready test-capture image as a blob and returns a transient
 * object URL the browser can pass to <img>. The <img> tag cannot send
 * Authorization headers, so we fetch via the authed API client and convert.
 */
export const useTestCaptureImage = (requestId: string | null, status: TestCaptureStatus['status'] | undefined) => {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!requestId || status !== 'ready') {
      setUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null

    const run = async () => {
      try {
        const path = `/cameras/test-capture/${encodeURIComponent(requestId)}/image`
        const fullUrl = `${appConstants.API_BASE_URL}${path}`
        const user = auth.currentUser
        const token = user ? await user.getIdToken() : null
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(fullUrl, { headers })
        if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setUrl(createdUrl)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      }
    }
    void run()

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [requestId, status])

  return { url, error }
}
