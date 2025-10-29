import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useUserProfile } from '../features/setup/hooks/useUserProfile'
import SetupPage from '../features/setup/SetupPage'
import { AppShell } from './AppShell'
import DashboardPage from '../features/dashboard/DashboardPage'
import type { SetupProfile } from '../features/setup/state'

type ProtectedOutletContext = {
  profile: SetupProfile
}

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { profile, loading: profileLoading } = useUserProfile(user ? user.uid : null)

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-gray-500">Checking session...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!profile || !profile.setupCompleted) {
    return <Navigate to="/setup" replace />
  }

  return (
    <AppShell profile={profile}>
      <Outlet context={{ profile } satisfies ProtectedOutletContext} />
    </AppShell>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])
