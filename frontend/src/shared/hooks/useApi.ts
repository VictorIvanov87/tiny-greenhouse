import type { User } from 'firebase/auth'
import { auth } from '../../features/auth/firebase'
import { appConstants } from '../config/constants'

type QueryValue = string | number | boolean | null | undefined | Date

type ApiRequestConfig = {
  params?: Record<string, QueryValue>
  signal?: AbortSignal
  headers?: Record<string, string | undefined>
}

type ApiResponse<T> = {
  data: T
}

const buildQueryString = (params: Record<string, QueryValue> = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (value instanceof Date) {
      search.append(key, value.toISOString())
      return
    }

    search.append(key, String(value))
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

const resolveUrl = (path: string, query: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appConstants.API_BASE_URL}${normalizedPath}${query}`
}

const getAuthHeader = async (user: User | null) => {
  if (!user) {
    return {}
  }

  try {
    const token = await user.getIdToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch (error) {
    console.warn('Failed to fetch auth token', error)
    return {}
  }
}

const get = async <T>(
  path: string,
  { params, signal, headers: extraHeaders }: ApiRequestConfig = {},
): Promise<ApiResponse<T>> => {
  const query = params ? buildQueryString(params) : ''
  const url = resolveUrl(path, query)
  const authHeader = await getAuthHeader(auth.currentUser)
  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      ...authHeader,
      ...extraHeaders,
    },
  })

  const payload = (await response.json()) as T

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return { data: payload }
}

export const api = {
  get,
}

export type ApiClient = typeof api
