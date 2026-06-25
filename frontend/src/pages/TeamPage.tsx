import { Link, useParams } from 'react-router-dom'
import { useMatches } from '@/api/hooks'
import type { Match } from '@/api/types'
import { ErrorBox, Loading } from '@/components/Status'
import Flag from '@/components/Flag'
import { formatDayMonth, formatTime, formattedScore } from '@/lib/format'
import { matchCountLabel, teamOutcome, teamRecord, teamSchedule, type TeamOutcome } from '@/lib/teams'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// W/R/P badge for a finished match, from this team's perspective.
const OUTCOME: Record<TeamOutcome, { label: string; title: string; cls: string }> = {
  win: { label: 'W', title: 'Wygrana', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  draw: { label: 'R', title: 'Remis', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  loss: { label: 'P', title: 'Porażka', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}

// A team name inside a row: the current team (the page you're on) is plain bold
// text; the opponent links to its own history.
function TeamName({ team, current }: { team: string; current: string }) {
  if (team === current) return <span className="font-bold">{team}</span>
  return (
    <Link
      to={`/teams/${encodeURIComponent(team)}`}
      className="relative z-10 font-medium hover:text-brand hover:underline"
    >
      {team}
    </Link>
  )
}

// One row of the team's history: date, the match line (this team in bold, the
// opponent a link to its page), and a result badge for finished matches or the
// kick-off time for upcoming ones. The row opens the match via an overlay link
// painted beneath the opponent's name link (anchors can't nest), so clicking the
// opponent goes to their history and clicking anywhere else opens the match.
function TeamMatchRow({ match, team }: { match: Match; team: string }) {
  const outcome = teamOutcome(match, team)
  const badge = outcome ? OUTCOME[outcome] : null
  return (
    <div className="group relative flex items-center gap-2 px-4 py-3 hover:bg-black/5 sm:gap-3 sm:px-5 dark:hover:bg-white/5">
      <Link
        to={`/matches/${match.id}`}
        aria-label={`${match.team_a} – ${match.team_b}`}
        className="absolute inset-0"
      />
      <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted">{formatDayMonth(match.start)}</span>
      <span className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
        <span className="flex flex-1 items-center justify-end gap-2 text-right text-ink">
          <TeamName team={match.team_a} current={team} />
          <Flag team={match.team_a} className="h-3.5 w-5 shrink-0 rounded-sm" />
        </span>
        <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink">
          {formattedScore(match.result_a, match.result_b)}
        </span>
        <span className="flex flex-1 items-center gap-2 text-ink">
          <Flag team={match.team_b} className="h-3.5 w-5 shrink-0 rounded-sm" />
          <TeamName team={match.team_b} current={team} />
        </span>
      </span>
      <span className="flex w-10 shrink-0 justify-end">
        {badge ? (
          <span
            title={badge.title}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${badge.cls}`}
          >
            {badge.label}
          </span>
        ) : (
          <span className="text-xs font-medium tabular-nums text-muted">{formatTime(match.start)}</span>
        )}
      </span>
    </div>
  )
}

function MatchSection({ title, matches, team }: { title: string; matches: Match[]; team: string }) {
  if (matches.length === 0) return null
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <h3 className="text-sm font-bold text-muted">{title}</h3>
      </div>
      <div className="divide-y divide-line/60">
        {matches.map((match) => (
          <TeamMatchRow key={match.id} match={match} team={team} />
        ))}
      </div>
    </section>
  )
}

// A single team's match history, reachable by clicking a team name in a match.
// Everything is derived client-side from the already-loaded match list — see
// teamSchedule in @/lib/teams.
export default function TeamPage() {
  const { name = '' } = useParams()
  const { data, isLoading, isError } = useMatches()

  useDocumentTitle(name)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const { finished, upcoming } = teamSchedule(data, name)
  const record = teamRecord(finished, name)
  const empty = finished.length === 0 && upcoming.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <i className="fas fa-angle-left" aria-hidden="true" /> Mecze
      </Link>

      <section className="card card-body">
        <div className="flex items-center gap-3">
          <Flag team={name} className="h-6 w-9 shrink-0 rounded-sm" />
          <h1 className="text-xl font-bold text-ink">{name}</h1>
        </div>
        {record.played > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{matchCountLabel(record.played)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400">{record.wins}</span>
              <span className="text-muted/60">-</span>
              <span className="text-amber-600 dark:text-amber-400">{record.draws}</span>
              <span className="text-muted/60">-</span>
              <span className="text-rose-600 dark:text-rose-400">{record.losses}</span>
            </span>
            <span className="text-xs">(W-R-P)</span>
          </p>
        )}
      </section>

      {empty ? (
        <div className="card card-body text-center text-muted">Brak meczów dla tej drużyny.</div>
      ) : (
        <>
          <MatchSection title="Zakończone" matches={finished} team={name} />
          <MatchSection title="Nadchodzące" matches={upcoming} team={name} />
        </>
      )}
    </div>
  )
}
