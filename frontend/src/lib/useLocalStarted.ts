import { useEffect, useState } from 'react'
import type { Match } from '@/api/types'

// Tracks whether a match has started, flipping to true at kickoff time without
// needing a page refresh.
export function useLocalStarted(match: Match): boolean {
  const [started, setStarted] = useState(
    () => match.started || Date.now() >= new Date(match.start).getTime(),
  )
  useEffect(() => {
    if (started) return
    const ms = new Date(match.start).getTime() - Date.now()
    if (ms <= 0) { setStarted(true); return }
    const id = setTimeout(() => setStarted(true), ms)
    return () => clearTimeout(id)
  }, [match.start, started])
  return started
}
