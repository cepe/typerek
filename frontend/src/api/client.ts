import axios from 'axios'
import type { ApiError } from './types'

const TOKEN_KEY = 'typerek_token'

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

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
})

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 the token is stale: clear it and let the app react (AuthProvider
// listens for this and redirects to the sign-in page).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setToken(null)
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

// Pull a user-facing message out of an API error response, with a fallback.
export function apiErrorMessage(error: unknown, fallback = 'Wystąpił błąd'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.message ?? fallback
  }
  return fallback
}

export default api
