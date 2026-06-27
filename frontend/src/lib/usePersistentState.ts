import { useEffect, useState } from 'react'

// useState whose value is mirrored to localStorage, so it survives a page refresh
// on the same device. Read lazily on mount and written back on every change;
// storage failures (private mode / disabled storage) are swallowed, mirroring the
// defensive access in lib/theme.ts. Scope to a namespaced key, e.g.
// 'typerek.ruleStrategy'.
export function usePersistentState(key: string, initial: string): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Best-effort cache; ignore storage failures.
    }
  }, [key, value])

  return [value, setValue]
}
