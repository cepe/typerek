import { useMemo, useState } from 'react'
import { useMatches, useRanking } from '@/api/hooks'
import MatchLine from '@/components/MatchLine'
import BetGrid from '@/components/BetGrid'
import { formatDateLong, groupByDay, pointsDisplay } from '@/lib/format'
import { randomSeed, scoreSeed, seededPick } from '@/lib/seedStrategy'

interface Props {
  seed: string
  onSeedChange: (seed: string) => void
}

// Controls the seed strategy: a toy "virtual player" you parameterize with a word.
// Its seed deterministically draws a 1/X/2 pick on every finished match, scored
// live off the cached match list. The seed lives in RankingPage so the strategy can
// also appear as a row in the ranking; this card is the input plus a "Podejrzyj
// typy" preview of the seed's pick on every started match (hits/misses included),
// reusing the same per-match layout as the player and virtual-strategy profiles.
// Rendered only while the "Wirtualni gracze" overlay is on.
export default function SeedStrategyCard({ seed, onSeedChange }: Props) {
  const [showPicks, setShowPicks] = useState(false)
  const { data: matches } = useMatches()
  const { data: ranking } = useRanking()

  const finished = matches?.finished ?? []
  const trimmed = seed.trim()

  const score = useMemo(
    () => (trimmed === '' || finished.length === 0 ? null : scoreSeed(trimmed, finished)),
    [trimmed, finished],
  )

  // Started matches (finished + live), newest first — the same set the player and
  // virtual-strategy profiles show their picks over.
  const started = useMemo(() => {
    const fin = matches?.finished ?? []
    const live = (matches?.not_finished ?? []).filter((match) => match.started)
    return [...fin, ...live].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  }, [matches])

  const perfectScore = ranking?.perfect_score ?? 0
  const share = score && perfectScore > 0 ? Math.round((score.points / perfectScore) * 100) : null
  const canPreview = trimmed !== '' && started.length > 0

  return (
    <>
      <div className="card mb-4 overflow-hidden">
        <div className="card-header">
          <h3 className="flex items-center gap-2 text-sm font-bold text-muted">
            <i className="fas fa-dice text-brand" aria-hidden="true" /> Strategia z seeda
          </h3>
        </div>
        <div className="space-y-3 px-4 py-3">
          <p className="text-xs text-muted">
            Wpisz słowo — z jego seeda deterministycznie losowane są typy (1/X/2) na każdy rozegrany mecz. Szukaj
            takiego, który da najwięcej punktów. Pojawia się w rankingu poniżej.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={seed}
              onChange={(event) => onSeedChange(event.target.value)}
              placeholder="np. messi2026"
              aria-label="Seed strategii"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field flex-1"
            />
            <button
              type="button"
              onClick={() => onSeedChange(randomSeed())}
              title="Losuj seed"
              className="btn btn-outline btn-sm shrink-0"
            >
              <i className="fas fa-dice" aria-hidden="true" /> Losuj
            </button>
          </div>
          {finished.length === 0 ? (
            <p className="text-sm text-muted">Brak rozegranych meczów — nie ma jeszcze czego punktować.</p>
          ) : score ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span>
                <span className="font-bold text-ink tabular-nums">{pointsDisplay(score.points)}</span> pkt
                {share != null && <span className="text-muted"> ({share}%)</span>} ·{' '}
                <span className="tabular-nums">{score.accuracy}</span> trafień
              </span>
              {canPreview && (
                <button
                  type="button"
                  onClick={() => setShowPicks((value) => !value)}
                  aria-expanded={showPicks}
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  <i className={`fas fa-chevron-${showPicks ? 'up' : 'down'} text-xs`} aria-hidden="true" />
                  {showPicks ? 'Ukryj typy' : 'Podejrzyj typy'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Wpisz seed, aby zobaczyć wynik.</p>
          )}
        </div>
      </div>
      {showPicks && canPreview && (
        <div className="mb-4 space-y-4">
          {groupByDay(started).map((group) => (
            <section key={group.start} className="card overflow-hidden">
              <div className="card-header">
                <h3 className="text-sm font-bold text-muted">{formatDateLong(group.start)}</h3>
              </div>
              <div className="divide-y divide-line/60">
                {group.items.map((match) => (
                  <div
                    key={match.id}
                    className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5${
                      match.started && !match.finished ? ' bg-highlight/70' : ''
                    }`}
                  >
                    <MatchLine match={match} />
                    <div className="sm:w-[340px]">
                      <BetGrid match={match} myAnswer={seededPick(trimmed, match.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
