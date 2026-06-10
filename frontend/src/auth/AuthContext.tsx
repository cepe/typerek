import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import api, { getToken, setToken } from '@/api/client'
import type { AuthResult, CurrentUser } from '@/api/types'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signIn: (username: string, password: string) => Promise<void>
  applyAuth: (result: AuthResult) => void
  signOut: () => void
  refresh: () => Promise<void>
  // Merge fields into the cached user without a round trip — used after a write
  // that already returns the updated slice (e.g. saving settings), so we avoid a
  // full, slow GET /me just to learn what we just changed.
  patchUser: (partial: Partial<CurrentUser>) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await api.get<CurrentUser>('/me')
      setUser(data)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  // The API client clears the token and dispatches this on any 401.
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResult>('/auth/login', { username, password })
    setToken(data.token)
    setUser(data.user)
  }, [])

  const applyAuth = useCallback((result: AuthResult) => {
    setToken(result.token)
    setUser(result.user)
  }, [])

  const signOut = useCallback(() => {
    void api.post('/auth/logout').catch(() => undefined)
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const data = await api.get<CurrentUser>('/me')
    setUser(data)
  }, [])

  const patchUser = useCallback((partial: Partial<CurrentUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev))
  }, [])

  const value: AuthState = {
    user,
    loading,
    isAuthenticated: user !== null,
    isAdmin: user?.admin ?? false,
    signIn,
    applyAuth,
    signOut,
    refresh,
    patchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
