import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Flag from './Flag'
import { formatTime, formattedScore } from '@/lib/format'
import type { Match } from '@/api/types'

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
  const [remaining, setRemaining] = useState(() => new Date(start).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(new Date(start).getTime() - Date.now())
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [start])

  if (remaining <= 0 || remaining > SIX_HOURS) return null

  const urgent = remaining < 30 * 60 * 1000
  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide ${urgent ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
      za <span className="tabular-nums">{formatCountdown(remaining)}</span>
    </span>
  )
}

// Clickable match line: time on the left, then "TeamA <flag>  score  <flag> TeamB"
// with the score centered. Mirrors matches/_match_line.html.erb.
export default function MatchLine({ match }: { match: Match }) {
  const live = match.started && !match.finished
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
        {!match.started && <Countdown start={match.start} />}
      </span>
      <span className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
        <span className="flex-1 text-right font-semibold text-ink group-hover:text-brand">
          {match.team_a}
          <Flag team={match.team_a} className="ml-2 inline-block h-3.5 w-5 rounded-sm align-[-0.15em]" />
        </span>
        <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink">
          {formattedScore(match.result_a, match.result_b)}
        </span>
        <span className="flex-1 text-left font-semibold text-ink group-hover:text-brand">
          <Flag team={match.team_b} className="mr-2 inline-block h-3.5 w-5 rounded-sm align-[-0.15em]" />
          {match.team_b}
        </span>
      </span>
    </Link>
  )
}
