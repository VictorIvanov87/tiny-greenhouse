import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useUserProfile } from '../features/setup/hooks/useUserProfile'
import { AppShell } from './AppShell'
import DashboardPage from '../features/dashboard/DashboardPage'
import NotificationsPage from '../features/notifications/NotificationsPage'
import SensorDataPage from '../features/telemetry/SensorDataPage'
import AlertsPage from '../features/alerts/AlertsPage'
import SettingsPage from '../features/settings/SettingsPage'
import AssistantPage from '../features/assistant/AssistantPage'
import Logout from '../features/auth/Logout'
import type { SetupProfile } from '../features/setup/state'
import TimelapsePage from '../features/timelapse/TimelapsePage'
import SetupWizard from '../features/setup/wizard/SetupWizard'

type ProtectedOutletContext = {
  profile: SetupProfile
}

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { profile, loading: profileLoading } = useUserProfile(user ? user.uid : null)

  if (loading || profileLoading || profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-gray-500">Checking session...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-gray-500">Checking session...</span>
      </div>
    )
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
    element: <SetupWizard />,
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
        path: '/notifications',
        element: <NotificationsPage />,
      },
      {
        path: '/alerts',
        element: <AlertsPage />,
      },
      {
        path: '/timelapse',
        element: <TimelapsePage />,
      },
      {
        path: '/sensor-data',
        element: <SensorDataPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '/assistant',
        element: <AssistantPage />,
      },
      {
        path: '/logout',
        element: <Logout />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])
