import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '@/api/hooks'
import type { Match, MatchList } from '@/api/types'
import Flag from './Flag'
import { formatDayMonth, formattedScore } from '@/lib/format'
import {
  matchCountLabel,
  teamOutcome,
  teamRecord,
  teamSchedule,
  type TeamOutcome,
  type TeamRecord,
} from '@/lib/teams'

// W/R/P badge for a finished match, from the focused team's perspective.
const OUTCOME: Record<TeamOutcome, { label: string; title: string; cls: string }> = {
  win: { label: 'W', title: 'Wygrana', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  draw: { label: 'R', title: 'Remis', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  loss: { label: 'P', title: 'Porażka', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}

// Compact "X meczów · W-R-P" record line.
function RecordSummary({ record }: { record: TeamRecord }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted">
      <span>{matchCountLabel(record.played)}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
        <span className="text-emerald-600 dark:text-emerald-400">{record.wins}</span>
        <span className="text-muted/60">-</span>
        <span className="text-amber-600 dark:text-amber-400">{record.draws}</span>
        <span className="text-muted/60">-</span>
        <span className="text-rose-600 dark:text-rose-400">{record.losses}</span>
      </span>
    </span>
  )
}

// A finished match in a team's history: date, the scoreline (the focused team in
// bold) and a W/R/P badge. The row links to that match's details.
function PlayedRow({ match, team }: { match: Match; team: string }) {
  const outcome = teamOutcome(match, team)
  const badge = outcome ? OUTCOME[outcome] : null
  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 sm:px-5 dark:hover:bg-white/5"
    >
      <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted">{formatDayMonth(match.start)}</span>
      <span className="flex flex-1 items-center justify-center gap-2">
        <span
          className={`flex flex-1 items-center justify-end gap-2 text-right text-ink ${
            match.team_a === team ? 'font-bold' : 'font-medium'
          }`}
        >
          {match.team_a}
          <Flag team={match.team_a} className="h-3.5 w-5 shrink-0 rounded-sm" />
        </span>
        <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-sm font-bold tabular-nums text-ink">
          {formattedScore(match.result_a, match.result_b)}
        </span>
        <span
          className={`flex flex-1 items-center gap-2 text-ink ${match.team_b === team ? 'font-bold' : 'font-medium'}`}
        >
          <Flag team={match.team_b} className="h-3.5 w-5 shrink-0 rounded-sm" />
          {match.team_b}
        </span>
      </span>
      <span className="flex w-6 shrink-0 justify-end">
        {badge && (
          <span
            title={badge.title}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${badge.cls}`}
          >
            {badge.label}
          </span>
        )}
      </span>
    </Link>
  )
}

// One team's block: an always-visible header (flag, name, record) that toggles a
// collapsible list of the team's other played matches. `currentId` drops the
// match you're already looking at from its own teams' histories.
function TeamBlock({ team, list, currentId }: { team: string; list: MatchList; currentId: number }) {
  const [open, setOpen] = useState(false)
  const played = teamSchedule(list, team).finished.filter((match) => match.id !== currentId)
  const record = teamRecord(played, team)
  const hasMatches = played.length > 0
  return (
    <div>
      <button
        type="button"
        onClick={() => hasMatches && setOpen((value) => !value)}
        disabled={!hasMatches}
        aria-expanded={hasMatches ? open : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5 ${
          hasMatches ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default'
        }`}
      >
        <Flag team={team} className="h-5 w-7 shrink-0 rounded-sm" />
        <span className="font-bold text-ink">{team}</span>
        <span className="ml-auto flex items-center gap-3">
          {hasMatches ? (
            <RecordSummary record={record} />
          ) : (
            <span className="text-xs text-muted">Brak rozegranych meczów</span>
          )}
          {hasMatches && (
            <i
              className={`fas fa-chevron-down text-xs text-muted transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          )}
        </span>
      </button>
      {open && hasMatches && (
        <div className="divide-y divide-line/60 border-t border-line/60 bg-surface/40">
          {played.map((match) => (
            <PlayedRow key={match.id} match={match} team={team} />
          ))}
        </div>
      )}
    </div>
  )
}

// Stats for both teams playing in a match: each team's win/draw/loss record over
// the matches it has played, plus a collapsible list of those matches with their
// results. Everything is derived from the already-cached match list (useMatches),
// so it needs no extra data from the match detail itself.
export default function MatchTeamStats({ match }: { match: Match }) {
  const { data } = useMatches()
  if (!data) return null

  // Guard against the (degenerate) case of a team facing itself.
  const teams = match.team_a === match.team_b ? [match.team_a] : [match.team_a, match.team_b]

  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <h3 className="flex items-center gap-2">
          <i className="fas fa-chart-simple text-brand" aria-hidden="true" /> Statystyki drużyn
        </h3>
      </div>
      <div className="divide-y divide-line/60">
        {teams.map((team) => (
          <TeamBlock key={team} team={team} list={data} currentId={match.id} />
        ))}
      </div>
    </section>
  )
}
