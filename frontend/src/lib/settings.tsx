import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import type { UserSettings } from '@/api/types'

// Client-side view of the per-user UI preferences. The source of truth lives on
// the backend (User#settings); this context mirrors it in camelCase and writes
// changes through PATCH /me/settings. Kept as an object so more accessibility
// options can be added later without touching the storage shape.
interface Settings {
  // "Drzewko mode": make the current user's nick + position in the ranking easier
  // to find (a prominent "Twoja pozycja" banner with a jump-to-me button).
  drzewkoMode: boolean
  // Show the padlock that locks a bet against accidental changes. Opt-in: not
  // everyone wants the extra control, so it is off by default.
  betLock: boolean
}

const DEFAULTS: Settings = {
  drzewkoMode: false,
  betLock: false,
}

// Map between the server shape (snake_case, the API contract) and ours (camelCase).
function fromServer(settings: UserSettings | undefined): Settings {
  return {
    drzewkoMode: settings?.drzewko_mode ?? DEFAULTS.drzewkoMode,
    betLock: settings?.bet_lock ?? DEFAULTS.betLock,
  }
}

interface SettingsState extends Settings {
  setDrzewkoMode: (value: boolean) => void
  setBetLock: (value: boolean) => void
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, refresh } = useAuth()
  const [settings, setSettings] = useState<Settings>(() => fromServer(user?.settings))

  // Re-sync whenever the signed-in user (and their persisted settings) changes.
  useEffect(() => {
    setSettings(fromServer(user?.settings))
  }, [user])

  // Update locally first (snappy toggle), then persist. On failure, fall back to
  // whatever the server currently holds.
  const persist = (optimistic: Partial<Settings>, patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...optimistic }))
    api
      .patch('/me/settings', { settings: patch })
      .then(() => refresh())
      .catch(() => setSettings(fromServer(user?.settings)))
  }

  const value: SettingsState = {
    ...settings,
    setDrzewkoMode: (drzewkoMode) => persist({ drzewkoMode }, { drzewko_mode: drzewkoMode }),
    setBetLock: (betLock) => persist({ betLock }, { bet_lock: betLock }),
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
