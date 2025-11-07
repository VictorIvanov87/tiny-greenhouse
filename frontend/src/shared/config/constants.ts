const FRONTEND_PORT = 5173
const BACKEND_PORT = 3000
const API_BASE_URL = `http://localhost:${BACKEND_PORT}/api`
const TELEMETRY_DEFAULT_LIMIT = 25

export const appConstants = {
  FRONTEND_PORT,
  BACKEND_PORT,
  API_BASE_URL,
  TELEMETRY_DEFAULT_LIMIT,
} as const
