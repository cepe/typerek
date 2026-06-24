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
  const { isAdmin, user } = useAuth()
  const { favoriteUserIds, toggleFavorite, matchOrderByRanking } = useSettings()
  const { data: match, isLoading, isError } = useMatch(id)
  const placeBet = usePlaceBet()
  const favorites = new Set(favoriteUserIds)
  const [selectedResult, setSelectedResult] = useState<BetType | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  useDocumentTitle(match ? `${match.team_a} – ${match.team_b}` : undefined)

  if (isLoading) return <Loading />
  if (isError || !match) return <ErrorBox />

  const scored = match.finished ? new Set(winningBets(match.result_a, match.result_b)) : null
  const live = match.started && !match.finished
  // "Favourites only" lets you pull your starred players out of a long participant
  // list without scrolling (your own row stays too); it stacks with the chart's
  // result filter.
  const hasFavorites = (match.participants ?? []).some((p) => favorites.has(p.user.id))
  const visibleParticipants = (match.participants ?? [])
    .filter((p) => selectedResult === null || p.result === selectedResult)
    .filter((p) => !favoritesOnly || favorites.has(p.user.id) || p.user.id === user?.id)
  // Opt-in: order the list by ranking position instead of the server's alphabetical
  // order, so you can read the standings off after a match. Unranked players (no
  // position) fall to the bottom; ties keep the alphabetical order (stable sort).
  const orderedParticipants = matchOrderByRanking
    ? [...visibleParticipants].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity))
    : visibleParticipants

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
            {(hasFavorites || favoritesOnly) && (
              <button
                type="button"
                onClick={() => setFavoritesOnly((value) => !value)}
                aria-pressed={favoritesOnly}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  favoritesOnly
                    ? 'border-amber-400 bg-amber-100/80 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'border-line text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <i className={`${favoritesOnly ? 'fas text-yellow-400' : 'far'} fa-star`} aria-hidden="true" />
                Tylko ulubieni
              </button>
            )}
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
            {orderedParticipants.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">Brak uczestników do pokazania.</p>
            )}
            {orderedParticipants.map((participant) => {
              const me = participant.user.id === user?.id
              const fav = !me && favorites.has(participant.user.id)
              return (
              <div
                key={participant.user.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                  fav ? 'bg-amber-100/80 dark:bg-amber-500/10' : ''
                }`}
              >
                <div className={`flex items-center gap-1.5 ${fav ? 'font-semibold' : 'font-medium'}`}>
                  {/* When ordering by ranking, lead each row with its position so the
                      standings read off at a glance. */}
                  {matchOrderByRanking && (
                    <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">
                      {participant.position ?? '—'}
                    </span>
                  )}
                  {/* Reserve the star's slot for your own row (you can't favourite
                      yourself) so every username lines up. */}
                  {me ? (
                    <span className="h-6 w-6 shrink-0" aria-hidden="true" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(participant.user.id)}
                      aria-pressed={fav}
                      aria-label={
                        fav
                          ? `Usuń ${participant.user.username} z ulubionych`
                          : `Dodaj ${participant.user.username} do ulubionych`
                      }
                      title={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        fav ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted/40 hover:text-yellow-400'
                      }`}
                    >
                      <i className={`${fav ? 'fas' : 'far'} fa-star`} aria-hidden="true" />
                    </button>
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
                          <span className="bet-odds">{formattedOdds(match.odds[result])}</span>
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
