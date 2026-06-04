import { Link } from 'react-router-dom'
import Flag from './Flag'
import { formatTime, formattedScore } from '@/lib/format'
import type { Match } from '@/api/types'

// Clickable match line: time on the left, then "TeamA <flag>  score  <flag> TeamB"
// with the score centered. Mirrors matches/_match_line.html.erb.
export default function MatchLine({ match }: { match: Match }) {
  const live = match.started && !match.finished
  return (
    <Link to={`/matches/${match.id}`} className="group flex items-center gap-2 sm:flex-1 sm:gap-3">
      <span className="flex w-11 shrink-0 flex-col gap-0.5">
        <span className="text-sm font-semibold tabular-nums text-muted">{formatTime(match.start)}</span>
        {live && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold leading-none text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden="true" />
            Trwa
          </span>
        )}
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
