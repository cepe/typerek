import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Client-side UI preferences, persisted per-device in localStorage (there is no
// backend for user prefs). Kept as an object so more accessibility options can be
// added later without touching the storage shape.
interface Settings {
  // "Drzewko mode": make the current user's nick + position in the ranking easier
  // to find (a prominent "Twoja pozycja" banner with a jump-to-me button).
  drzewkoMode: boolean
}

const STORAGE_KEY = 'typerek_settings'

const DEFAULTS: Settings = {
  drzewkoMode: false,
}

interface SettingsState extends Settings {
  setDrzewkoMode: (value: boolean) => void
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULTS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const value: SettingsState = {
    ...settings,
    setDrzewkoMode: (drzewkoMode) => setSettings((prev) => ({ ...prev, drzewkoMode })),
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
