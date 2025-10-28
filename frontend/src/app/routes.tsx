import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import HomePage from '../features/home/HomePage'
import { useAuth } from '../features/auth/hooks/useAuth'

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-gray-500">Checking session...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
