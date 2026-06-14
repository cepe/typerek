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
  // Hide the kursy (odds) under each 1 / X / 2 pill so they don't sway the pick.
  // Opt-in, off by default.
  hideOdds: boolean
  // Hide the double-chance options (1X, X2, 12), leaving only 1 / X / 2.
  // Opt-in, off by default. Like hideOdds, it lifts on finished matches.
  hideDoubleChance: boolean
  // Opt-in master switch for Web Push notifications. The browser subscription side
  // effects live in usePushSubscription; this only mirrors the persisted flag.
  pushEnabled: boolean
  // Which kinds of push the user wants (only meaningful when pushEnabled). Default on.
  pushResults: boolean
  pushReminders: boolean
}

const DEFAULTS: Settings = {
  drzewkoMode: false,
  betLock: false,
  hideOdds: false,
  hideDoubleChance: false,
  pushEnabled: false,
  pushResults: true,
  pushReminders: true,
}

// Map between the server shape (snake_case, the API contract) and ours (camelCase).
function fromServer(settings: UserSettings | undefined): Settings {
  return {
    drzewkoMode: settings?.drzewko_mode ?? DEFAULTS.drzewkoMode,
    betLock: settings?.bet_lock ?? DEFAULTS.betLock,
    hideOdds: settings?.hide_odds ?? DEFAULTS.hideOdds,
    hideDoubleChance: settings?.hide_double_chance ?? DEFAULTS.hideDoubleChance,
    pushEnabled: settings?.push_enabled ?? DEFAULTS.pushEnabled,
    pushResults: settings?.push_results ?? DEFAULTS.pushResults,
    pushReminders: settings?.push_reminders ?? DEFAULTS.pushReminders,
  }
}

interface SettingsState extends Settings {
  // Resolve once the save has settled (whether it persisted or was rolled back),
  // so callers can reconcile any optimistic UI they showed in the meantime.
  setDrzewkoMode: (value: boolean) => Promise<void>
  setBetLock: (value: boolean) => Promise<void>
  setHideOdds: (value: boolean) => Promise<void>
  setHideDoubleChance: (value: boolean) => Promise<void>
  setPushEnabled: (value: boolean) => Promise<void>
  setPushResults: (value: boolean) => Promise<void>
  setPushReminders: (value: boolean) => Promise<void>
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, patchUser } = useAuth()
  const [settings, setSettings] = useState<Settings>(() => fromServer(user?.settings))

  // Re-sync whenever the signed-in user (and their persisted settings) changes.
  useEffect(() => {
    setSettings(fromServer(user?.settings))
  }, [user])

  // Update locally first (snappy toggle), then persist. The PATCH returns just the
  // updated settings, so we fold them into the cached user instead of paying for a
  // full GET /me. On failure, fall back to whatever the server currently holds.
  const persist = (optimistic: Partial<Settings>, patch: Partial<UserSettings>): Promise<void> => {
    setSettings((prev) => ({ ...prev, ...optimistic }))
    return api
      .patch<{ settings: UserSettings }>('/me/settings', { settings: patch })
      .then((res) => patchUser({ settings: res.settings }))
      .catch(() => setSettings(fromServer(user?.settings)))
  }

  const value: SettingsState = {
    ...settings,
    setDrzewkoMode: (drzewkoMode) => persist({ drzewkoMode }, { drzewko_mode: drzewkoMode }),
    setBetLock: (betLock) => persist({ betLock }, { bet_lock: betLock }),
    setHideOdds: (hideOdds) => persist({ hideOdds }, { hide_odds: hideOdds }),
    setHideDoubleChance: (hideDoubleChance) =>
      persist({ hideDoubleChance }, { hide_double_chance: hideDoubleChance }),
    setPushEnabled: (pushEnabled) => persist({ pushEnabled }, { push_enabled: pushEnabled }),
    setPushResults: (pushResults) => persist({ pushResults }, { push_results: pushResults }),
    setPushReminders: (pushReminders) => persist({ pushReminders }, { push_reminders: pushReminders }),
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
