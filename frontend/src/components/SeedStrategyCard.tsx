import { useMemo, useState } from 'react'
import { useMatches, useRanking } from '@/api/hooks'
import { pointsDisplay } from '@/lib/format'
import { randomSeed, scoreSeed } from '@/lib/seedStrategy'

// A toy strategy you parameterize with a word: its seed deterministically draws a
// 1/X/2 pick on every finished match, and the card scores it live against the real
// field. Everything runs in the browser off the cached match list, so it's instant
// and private — the game is to find a seed that scores the most points.
export default function SeedStrategyCard() {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState('')
  const { data: matches } = useMatches()
  const { data: ranking } = useRanking()

  const finished = matches?.finished ?? []
  const trimmed = seed.trim()
  const score = useMemo(
    () => (trimmed === '' || finished.length === 0 ? null : scoreSeed(trimmed, finished)),
    [trimmed, finished],
  )

  const entries = ranking?.entries ?? []
  const perfectScore = ranking?.perfect_score ?? 0
  // Where this score would slot into the real field (ties land behind the players
  // they match, hence "> points"); the field grows by one to include the seed.
  const position = score ? entries.filter((entry) => entry.points > score.points).length + 1 : null
  const share = score && perfectScore > 0 ? Math.round((score.points / perfectScore) * 100) : null

  return (
    <div className="card mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5"
      >
        <i className="fas fa-dice text-brand" aria-hidden="true" />
        <span className="text-sm font-bold text-muted">Strategia z seeda</span>
        <i
          className={`fas fa-chevron-down ml-auto text-xs text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line/60 px-4 py-3">
          <p className="text-xs text-muted">
            Wpisz słowo — z jego seeda deterministycznie losowane są typy (1/X/2) na każdy rozegrany mecz. Szukaj
            takiego, który da najwięcej punktów.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="np. messi2026"
              aria-label="Seed strategii"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field flex-1"
            />
            <button
              type="button"
              onClick={() => setSeed(randomSeed())}
              title="Losuj seed"
              className="btn btn-outline btn-sm shrink-0"
            >
              <i className="fas fa-dice" aria-hidden="true" /> Losuj
            </button>
          </div>
          {finished.length === 0 ? (
            <p className="text-sm text-muted">Brak rozegranych meczów — nie ma jeszcze czego punktować.</p>
          ) : score && position != null ? (
            <div className="rounded-lg bg-surface px-3 py-2 text-sm leading-relaxed">
              <span className="font-bold text-ink tabular-nums">{pointsDisplay(score.points)}</span> pkt
              {share != null && <span className="text-muted"> ({share}%)</span>} ·{' '}
              <span className="tabular-nums">{score.accuracy}</span> trafień ·{' '}
              byłby <span className="font-bold text-ink tabular-nums">{position}.</span> / {entries.length + 1}
            </div>
          ) : (
            <p className="text-sm text-muted">Wpisz seed, aby zobaczyć wynik.</p>
          )}
        </div>
      )}
    </div>
  )
}
