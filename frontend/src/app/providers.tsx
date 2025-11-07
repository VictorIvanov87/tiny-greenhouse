import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../features/auth/auth-context'
import { AlertsProvider } from '../features/alerts/AlertsProvider'

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <AuthProvider>
      <AlertsProvider>{children}</AlertsProvider>
    </AuthProvider>
  )
}
