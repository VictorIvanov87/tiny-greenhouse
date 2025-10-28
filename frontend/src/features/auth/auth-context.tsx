import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, authReady } from './firebase'
import { signOutUser } from './api'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false

    authReady
      .then(() => {
        if (cancelled) {
          return
        }

        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser)
          setLoading(false)
        })
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to initialise Firebase Auth persistence', error)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    setLoading(true)
    try {
      await signOutUser()
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signOut: handleSignOut,
    }),
    [handleSignOut, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
