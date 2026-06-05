import { Link, useParams } from 'react-router-dom'
import { useMatch, usePlaceBet } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import Flag from '@/components/Flag'
import BetGrid from '@/components/BetGrid'
import { BET_TYPES, betPillClass, winningBets } from '@/lib/bets'
import { formatShort, formattedOdds, formattedScore } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Mirrors matches/show.html.erb.
export default function MatchPage() {
  const { id = '' } = useParams()
  const { isAdmin } = useAuth()
  const { data: match, isLoading, isError } = useMatch(id)
  const placeBet = usePlaceBet()

  useDocumentTitle(match ? `${match.team_a} – ${match.team_b}` : undefined)

  if (isLoading) return <Loading />
  if (isError || !match) return <ErrorBox />

  const scored = match.finished ? new Set(winningBets(match.result_a, match.result_b)) : null
  const live = match.started && !match.finished

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <i className="fas fa-angle-left" aria-hidden="true" /> Mecze
      </Link>

      <section className="card card-body">
        {isAdmin && (
          <div className="mb-3 flex justify-end">
            <Link to={`/matches/${match.id}/edit`} className="btn btn-outline btn-sm">
              <i className="fas fa-pencil" aria-hidden="true" /> Edytuj
            </Link>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex-1 text-right text-lg font-bold text-ink">
            {match.team_a}
            <Flag team={match.team_a} className="ml-4 inline-block h-5 w-7 rounded-sm align-[-0.2em]" />
          </div>
          <div className="shrink-0 rounded-lg bg-surface px-4 py-2 text-2xl font-bold tabular-nums text-ink">
            {formattedScore(match.result_a, match.result_b)}
          </div>
          <div className="flex-1 text-left text-lg font-bold text-ink">
            <Flag team={match.team_b} className="mr-4 inline-block h-5 w-7 rounded-sm align-[-0.2em]" />
            {match.team_b}
          </div>
        </div>
        {live && (
          <p className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden="true" />
              Trwa
            </span>
          </p>
        )}
        <p className="mt-3 text-center text-sm text-muted">
          <i className="far fa-clock" aria-hidden="true" /> {formatShort(match.start)}
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <h3 className="flex items-center gap-2">
            <i className="fas fa-user text-brand" aria-hidden="true" /> Twój typ
          </h3>
        </div>
        <div className="card-body">
          {!match.started && <p className="mb-3 text-sm text-muted">Wybierz swój typ, klikając w kurs:</p>}
          <BetGrid
            match={match}
            myAnswer={match.my_answer}
            pending={placeBet.isPending}
            onBet={(result) => placeBet.mutate({ matchId: match.id, result })}
          />
        </div>
      </section>

      {match.started && match.participants && (
        <section className="card overflow-hidden">
          <div className="card-header">
            <h3 className="flex items-center gap-2">
              <i className="fas fa-users text-brand" aria-hidden="true" /> Typy uczestników
            </h3>
          </div>
          <div className="divide-y divide-line/60">
            {match.participants.map((participant) => (
              <div
                key={participant.user.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="font-medium">
                  <Link to={`/users/${participant.user.id}`} className="text-ink hover:text-brand">
                    {participant.user.username}
                  </Link>
                </div>
                {participant.result == null ? (
                  <span className="text-sm text-muted sm:ml-auto">Brak typu</span>
                ) : (
                  <div className="bet-grid sm:ml-auto sm:w-[340px]">
                    {BET_TYPES.map(([result, label]) => {
                      const chosen = participant.result === result
                      const isScored = scored?.has(result) ?? false
                      return (
                        <div
                          key={result}
                          className={betPillClass({
                            active: chosen,
                            scored: isScored,
                            finished: match.finished,
                            interactive: false,
                          })}
                        >
                          <span className="bet-key">{label}</span>
                          <span className="bet-odds">{formattedOdds(match.odds[result])}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
