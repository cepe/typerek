import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Flag from './Flag'
import { formatTime, formattedScore } from '@/lib/format'
import { useLocalStarted } from '@/lib/useLocalStarted'
import type { Match } from '@/api/types'

export { useLocalStarted } from '@/lib/useLocalStarted'

const SIX_HOURS = 6 * 60 * 60 * 1000

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}h ${pad(m)}m`
  return `${pad(m)}:${pad(s)}`
}

function Countdown({ start }: { start: string }) {
  const startMs = useMemo(() => new Date(start).getTime(), [start])
  const [remaining, setRemaining] = useState(() => startMs - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(startMs - Date.now())
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startMs])

  if (remaining <= 0 || remaining > SIX_HOURS) return null

  const urgent = remaining < 30 * 60 * 1000
  return (
    <span className={`text-[10px] font-bold leading-none ${urgent ? 'text-amber-600' : 'text-muted'}`}>
      za <span className="tabular-nums">{formatCountdown(remaining)}</span>
    </span>
  )
}

// Clickable match line: time on the left, then "TeamA <flag>  score  <flag> TeamB"
// with the score centered. Mirrors matches/_match_line.html.erb.
// `started` can be passed from a parent that already holds the value to avoid a
// duplicate hook call; when omitted, the component computes it internally.
export default function MatchLine({ match, started }: { match: Match; started?: boolean }) {
  const internal = useLocalStarted(match)
  const localStarted = started ?? internal
  const live = localStarted && !match.finished
  return (
    <Link to={`/matches/${match.id}`} className="group flex items-center gap-2 sm:flex-1 sm:gap-3">
      <span className="flex w-14 shrink-0 flex-col gap-0.5">
        <span className="text-sm font-semibold tabular-nums text-muted">{formatTime(match.start)}</span>
        {live && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold leading-none text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden="true" />
            Trwa
          </span>
        )}
        {!localStarted && <Countdown start={match.start} />}
      </span>
      <span className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
        <span className="flex flex-1 items-center justify-end gap-2 font-semibold text-ink group-hover:text-brand">
          {match.team_a}
          <Flag team={match.team_a} className="h-3.5 w-5 shrink-0 rounded-sm" />
        </span>
        <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink">
          {formattedScore(match.result_a, match.result_b)}
        </span>
        <span className="flex flex-1 items-center gap-2 font-semibold text-ink group-hover:text-brand">
          <Flag team={match.team_b} className="h-3.5 w-5 shrink-0 rounded-sm" />
          {match.team_b}
        </span>
      </span>
    </Link>
  )
}
