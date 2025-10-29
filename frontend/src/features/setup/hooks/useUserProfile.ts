import { useCallback, useEffect, useState } from 'react'
import type { SetupProfile } from '../state'
import { ensureUserDoc } from '../api'

export const useUserProfile = (uid: string | null) => {
  const [profile, setProfile] = useState<SetupProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(uid))
  const [error, setError] = useState<Error | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!uid) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    ensureUserDoc(uid)
      .then((result) => {
        if (!cancelled) {
          setProfile(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err as Error)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [uid, refreshToken])

  return { profile, loading, error, refresh }
}
