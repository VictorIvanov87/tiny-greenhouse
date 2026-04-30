const FRONTEND_PORT = 5173
const BACKEND_PORT = 3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : `http://localhost:${BACKEND_PORT}/api`
export const appConstants = {
  FRONTEND_PORT,
  BACKEND_PORT,
  API_BASE_URL,
} as const
