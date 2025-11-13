import type { User } from 'firebase/auth';
import { auth } from '../../features/auth/firebase';
import { appConstants } from '../config/constants';

type QueryValue = string | number | boolean | null | undefined | Date;

type ApiRequestConfig = {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
  headers?: Record<string, string | undefined>;
};

type ApiRequestOptions = ApiRequestConfig & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

type ApiResponse<T> = {
  data: T;
};

export class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const buildQueryString = (params: Record<string, QueryValue> = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (value instanceof Date) {
      search.append(key, value.toISOString());
      return;
    }

    search.append(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

const resolveUrl = (path: string, query: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appConstants.API_BASE_URL}${normalizedPath}${query}`;
};

const getAuthHeader = async (user: User | null) => {
  if (!user) {
    return {};
  }

  try {
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.warn('Failed to fetch auth token', error);
    return {};
  }
};

const request = async <T>(
  path: string,
  { params, signal, headers: extraHeaders, method = 'GET', body }: ApiRequestOptions = {}
): Promise<ApiResponse<T>> => {
  const query = params ? buildQueryString(params) : '';
  const url = resolveUrl(path, query);
  const authHeader = await getAuthHeader(auth.currentUser);
  const headers: Record<string, string | undefined> = {
    Accept: 'application/json',
    ...authHeader,
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const response = await fetch(url, {
    method,
    signal,
    headers: Object.fromEntries(
      Object.entries(headers).filter(([, value]) => value !== undefined)
    ) as Record<string, string>,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: T | null = null;
  let parseError: unknown = null;

  if (response.status !== 204) {
    try {
      payload = (await response.json()) as T;
    } catch (error) {
      parseError = error;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      payload
    );
  }

  if (parseError) {
    throw parseError;
  }

  return { data: (payload ?? (null as unknown)) as T };
};

export const api = {
  get: <T>(path: string, config?: ApiRequestConfig) => request<T>(path, config),
  post: <T>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: 'PATCH', body }),
  delete: <T>(path: string, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: 'DELETE' }),
};

export type ApiClient = typeof api;
