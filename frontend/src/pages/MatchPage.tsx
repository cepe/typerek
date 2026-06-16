import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMatch, usePlaceBet } from '@/api/hooks'
import type { BetType } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import Flag from '@/components/Flag'
import BetGrid from '@/components/BetGrid'
import LockToggle from '@/components/LockToggle'
import BetDistributionChart from '@/components/BetDistributionChart'
import { BET_TYPES, betPillClass, winningBets } from '@/lib/bets'
import { formatShort, formattedOdds, formattedScore } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useSettings } from '@/lib/settings'

// Mirrors matches/show.html.erb.
export default function MatchPage() {
  const { id = '' } = useParams()
  const { isAdmin } = useAuth()
  const { hideOdds, favoriteUserIds } = useSettings()
  const { data: match, isLoading, isError } = useMatch(id)
  const placeBet = usePlaceBet()
  const favorites = new Set(favoriteUserIds)
  const [selectedResult, setSelectedResult] = useState<BetType | null>(null)

  useDocumentTitle(match ? `${match.team_a} – ${match.team_b}` : undefined)

  if (isLoading) return <Loading />
  if (isError || !match) return <ErrorBox />

  const scored = match.finished ? new Set(winningBets(match.result_a, match.result_b)) : null
  const live = match.started && !match.finished
  const visibleParticipants = match.participants
    ? selectedResult === null
      ? match.participants
      : match.participants.filter((p) => p.result === selectedResult)
    : []

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
          <div className="flex flex-1 items-center justify-end gap-4 text-right text-lg font-bold text-ink">
            {match.team_a}
            <Flag team={match.team_a} className="h-5 w-7 shrink-0 rounded-sm" />
          </div>
          <div className="shrink-0 rounded-lg bg-surface px-4 py-2 text-2xl font-bold tabular-nums text-ink">
            {formattedScore(match.result_a, match.result_b)}
          </div>
          <div className="flex flex-1 items-center gap-4 text-left text-lg font-bold text-ink">
            <Flag team={match.team_b} className="h-5 w-7 shrink-0 rounded-sm" />
            {match.team_b}
          </div>
        </div>
        {live && (
          <p className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-0.5 text-xs font-bold text-highlight-fg">
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
          <LockToggle match={match} />
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
          {match.participants.some((p) => p.result != null) && (
            <div className="border-b border-line/60">
              <BetDistributionChart
                participants={match.participants}
                finished={match.finished}
                scoredBets={scored}
                selectedResult={selectedResult}
                onSelect={setSelectedResult}
              />
            </div>
          )}
          <div className="divide-y divide-line/60">
            {visibleParticipants.map((participant) => {
              const fav = favorites.has(participant.user.id)
              return (
              <div
                key={participant.user.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                  fav ? 'bg-amber-100/80 dark:bg-amber-500/10' : ''
                }`}
              >
                <div className={`flex items-center gap-1.5 ${fav ? 'font-semibold' : 'font-medium'}`}>
                  {fav && (
                    <i
                      className="fas fa-star text-xs text-yellow-400"
                      aria-label="Ulubiony"
                      title="Ulubiony"
                    />
                  )}
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
                          {(!hideOdds || match.finished) && (
                            <span className="bet-odds">{formattedOdds(match.odds[result])}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
