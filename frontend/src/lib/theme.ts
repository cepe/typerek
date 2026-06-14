// Colour-theme logic, shared by the React app (SettingsProvider) and the tiny
// anti-FOUC bootstrap script in index.html. Keep this dependency-free so it can be
// inlined/duplicated there without pulling anything in.

// User preference, persisted server-side (User#settings['theme']) and mirrored here.
//   'light' — dark mode off (default)
//   'dark'  — dark mode always on
//   'auto'  — dark at night, light during the day (see the window below)
export type ThemePreference = 'light' | 'dark' | 'auto'

// What's actually painted once a preference is resolved against the clock.
export type ResolvedTheme = 'light' | 'dark'

// "Depending on the hour" window: dark from 20:00 up to (but not including) 07:00.
// A fixed window, the same for everyone.
export const DARK_START_HOUR = 20
export const DARK_END_HOUR = 7

// localStorage cache of the preference, read by the bootstrap script before React
// mounts so the correct theme is applied without a flash of the wrong one.
export const STORAGE_KEY = 'typerek.theme'

const THEMES: ThemePreference[] = ['light', 'dark', 'auto']

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEMES as string[]).includes(value)
}

// True when the given moment falls inside the night window (dark in 'auto' mode).
export function isNightAt(date: Date): boolean {
  const hour = date.getHours()
  return hour >= DARK_START_HOUR || hour < DARK_END_HOUR
}

// Turn a preference into the theme to actually paint right now.
export function resolveTheme(pref: ThemePreference, now: Date = new Date()): ResolvedTheme {
  if (pref === 'auto') return isNightAt(now) ? 'dark' : 'light'
  return pref
}

// Top-bar colour per theme — must match --header in index.css. Also drives the
// mobile browser chrome (<meta name="theme-color">) so it matches the header.
export const HEADER_COLOR: Record<ResolvedTheme, string> = {
  light: '#12A751',
  dark: '#0F3D27',
}

// Flip the `dark` class on <html> (all CSS variables key off it) and keep the
// mobile address-bar colour in sync with the header.
export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', HEADER_COLOR[resolved])
}

export function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isThemePreference(value) ? value : 'light'
  } catch {
    // localStorage can throw (private mode / disabled storage) — fall back to light.
    return 'light'
  }
}

export function storePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Best-effort cache; ignore storage failures.
  }
}
