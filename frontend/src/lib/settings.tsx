import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import type { UserSettings } from '@/api/types'
import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  storePreference,
  type ThemePreference,
} from '@/lib/theme'

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
  // Opt-in master switch for Web Push notifications. The browser subscription side
  // effects live in usePushSubscription; this only mirrors the persisted flag.
  pushEnabled: boolean
  // Which kinds of push the user wants (only meaningful when pushEnabled). Default on.
  pushResults: boolean
  pushReminders: boolean
  // Colour theme: 'light' (dark mode off), 'dark' (always on), 'auto' (dark at night).
  theme: ThemePreference
  // IDs of users the viewer starred as favourites in the ranking. They are
  // highlighted in the ranking and in a match's participant list. Toggled from the
  // ranking via toggleFavorite; persisted server-side like the other preferences.
  favoriteUserIds: number[]
  // Order a match's participant list by ranking position instead of alphabetically.
  // Opt-in: off by default, toggled from the settings screen.
  matchOrderByRanking: boolean
  // Interleave the naive benchmark "players" into the ranking. Opt-in.
  virtualPlayers: boolean
  // Show the experimental seed-driven strategy in the ranking (within the virtual
  // players overlay). Opt-in, off by default.
  seedStrategy: boolean
}

const DEFAULTS: Settings = {
  drzewkoMode: false,
  betLock: false,
  pushEnabled: false,
  pushResults: true,
  pushReminders: true,
  theme: 'light',
  favoriteUserIds: [],
  matchOrderByRanking: false,
  virtualPlayers: false,
  seedStrategy: false,
}

// Map between the server shape (snake_case, the API contract) and ours (camelCase).
function fromServer(settings: UserSettings | undefined): Settings {
  return {
    drzewkoMode: settings?.drzewko_mode ?? DEFAULTS.drzewkoMode,
    betLock: settings?.bet_lock ?? DEFAULTS.betLock,
    pushEnabled: settings?.push_enabled ?? DEFAULTS.pushEnabled,
    pushResults: settings?.push_results ?? DEFAULTS.pushResults,
    pushReminders: settings?.push_reminders ?? DEFAULTS.pushReminders,
    // While signed out (no server settings), keep whatever theme the anti-FOUC
    // bootstrap already painted from the localStorage cache, so the sign-in screen
    // doesn't flash from the cached dark back to light. Once a user loads, the
    // server value (always present — it defaults to 'light') takes over.
    theme: settings?.theme ?? readStoredPreference(),
    favoriteUserIds: settings?.favorite_user_ids ?? DEFAULTS.favoriteUserIds,
    matchOrderByRanking: settings?.match_order_by_ranking ?? DEFAULTS.matchOrderByRanking,
    virtualPlayers: settings?.virtual_players ?? DEFAULTS.virtualPlayers,
    seedStrategy: settings?.seed_strategy ?? DEFAULTS.seedStrategy,
  }
}

interface SettingsState extends Settings {
  // Resolve once the save has settled (whether it persisted or was rolled back),
  // so callers can reconcile any optimistic UI they showed in the meantime.
  setDrzewkoMode: (value: boolean) => Promise<void>
  setBetLock: (value: boolean) => Promise<void>
  setPushEnabled: (value: boolean) => Promise<void>
  setPushResults: (value: boolean) => Promise<void>
  setPushReminders: (value: boolean) => Promise<void>
  setTheme: (value: ThemePreference) => Promise<void>
  // Add or remove a user from the viewer's favourites (starred in the ranking).
  toggleFavorite: (userId: number) => Promise<void>
  setMatchOrderByRanking: (value: boolean) => Promise<void>
  setVirtualPlayers: (value: boolean) => Promise<void>
  setSeedStrategy: (value: boolean) => Promise<void>
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, patchUser } = useAuth()
  const [settings, setSettings] = useState<Settings>(() => fromServer(user?.settings))

  // Re-sync whenever the signed-in user (and their persisted settings) changes.
  useEffect(() => {
    setSettings(fromServer(user?.settings))
  }, [user])

  // Apply the colour theme whenever the preference changes, and cache it so the
  // anti-FOUC bootstrap in index.html paints the right theme on the next load.
  // For 'auto', re-resolve on a timer (and when the tab becomes visible) so the
  // switch follows the clock across the 20:00 / 07:00 boundary without a reload.
  useEffect(() => {
    const theme = settings.theme
    const sync = () => applyTheme(resolveTheme(theme))
    sync()
    storePreference(theme)

    if (theme !== 'auto') return
    const interval = window.setInterval(sync, 60_000)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [settings.theme])

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
    setPushEnabled: (pushEnabled) => persist({ pushEnabled }, { push_enabled: pushEnabled }),
    setPushResults: (pushResults) => persist({ pushResults }, { push_results: pushResults }),
    setPushReminders: (pushReminders) => persist({ pushReminders }, { push_reminders: pushReminders }),
    setTheme: (theme) => persist({ theme }, { theme }),
    toggleFavorite: (userId) => {
      const next = settings.favoriteUserIds.includes(userId)
        ? settings.favoriteUserIds.filter((id) => id !== userId)
        : [...settings.favoriteUserIds, userId]
      return persist({ favoriteUserIds: next }, { favorite_user_ids: next })
    },
    setMatchOrderByRanking: (matchOrderByRanking) =>
      persist({ matchOrderByRanking }, { match_order_by_ranking: matchOrderByRanking }),
    setVirtualPlayers: (virtualPlayers) =>
      persist({ virtualPlayers }, { virtual_players: virtualPlayers }),
    setSeedStrategy: (seedStrategy) => persist({ seedStrategy }, { seed_strategy: seedStrategy }),
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
