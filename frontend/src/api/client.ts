import type { ApiError } from './types'

const TOKEN_KEY = 'typerek_token'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Thrown for any non-2xx response. Carries the HTTP status and the parsed body
// (our API's { error: { code, message } } shape) when one was returned.
export class ApiClientError extends Error {
  readonly status: number
  readonly body: ApiError | null

  constructor(status: number, body: ApiError | null) {
    super(body?.error?.message ?? `Request failed with status ${status}`)
    this.name = 'ApiClientError'
    this.status = status
    this.body = body
  }
}

type RequestBody = Record<string, unknown> | undefined

async function request<T>(method: string, path: string, body?: RequestBody): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // On 401 the token is stale: clear it and let the app react (AuthProvider
  // listens for this and redirects to the sign-in page).
  if (response.status === 401) {
    setToken(null)
    window.dispatchEvent(new Event('auth:unauthorized'))
  }

  // 204 (logout, delete) and other empty bodies have nothing to parse.
  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiClientError(response.status, data as ApiError | null)
  }
  return data as T
}

// Mirrors the slice of the axios surface this app used; each method resolves to the
// parsed JSON body (or void for responses without one).
const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: RequestBody) => request<T>('POST', path, body),
  put: <T>(path: string, body?: RequestBody) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: RequestBody) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

// Pull a user-facing message out of an API error, with a fallback.
export function apiErrorMessage(error: unknown, fallback = 'Wystąpił błąd'): string {
  if (error instanceof ApiClientError) {
    return error.body?.error?.message ?? fallback
  }
  return fallback
}

export default api
