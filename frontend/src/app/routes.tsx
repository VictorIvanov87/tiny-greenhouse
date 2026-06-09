import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useUserProfile } from '../features/setup/hooks/useUserProfile'
import { AppShell } from './AppShell'
import type { SetupProfile } from '../features/setup/state'

const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const SetupWizard = lazy(() => import('../features/setup/wizard/SetupWizard'))
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage'))
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage'))
const TimelapsePage = lazy(() => import('../features/timelapse/TimelapsePage'))
const SensorDataPage = lazy(() => import('../features/telemetry/SensorDataPage'))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'))
const AssistantPage = lazy(() => import('../features/assistant/AssistantPage'))
const Logout = lazy(() => import('../features/auth/Logout'))

const PageFallback = () => (
  <div className="flex h-full items-center justify-center">
    <span className="text-sm text-slate-400">Loading...</span>
  </div>
)

const FullPageFallback = () => (
  <div className="flex min-h-[100dvh] items-center justify-center">
    <span className="text-sm text-slate-400">Loading...</span>
  </div>
)

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
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
      <Suspense fallback={<PageFallback />}>
        <Outlet context={{ profile } satisfies ProtectedOutletContext} />
      </Suspense>
    </AppShell>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/setup',
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <SetupWizard />
      </Suspense>
    ),
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
