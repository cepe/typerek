import { betPillClass, visibleBetTypes, winningBets } from '@/lib/bets'
import { formattedOdds } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import type { BetType, Match } from '@/api/types'

interface Props {
  match: Match
  myAnswer: BetType | null
  // When omitted (or the match has started) the grid is read-only.
  onBet?: (result: BetType) => void
  pending?: boolean
  // Lets the parent pass a locally-derived started value so the grid locks at
  // kickoff without waiting for a page refresh.
  started?: boolean
}

// The 1 / X / 2 / 1X / X2 / 12 row. Mirrors matches/_buttons.html.erb: a started
// match locks the pills, the chosen pill is highlighted, and a finished match
// marks the viewer's own pick as a hit or a miss. A bet the viewer locked
// (my_locked) is read-only too, until they unlock it via LockToggle.
export default function BetGrid({ match, myAnswer, onBet, pending, started }: Props) {
  const { betLock, hideOdds, hideDoubleChance } = useSettings()
  const hasStarted = started ?? match.started
  // The lock only restricts editing when the viewer has the feature enabled.
  const locked = betLock && match.my_locked
  const interactive = Boolean(onBet) && !hasStarted && !locked
  const scored = match.finished ? new Set(winningBets(match.result_a, match.result_b)) : null
  // Both "hide" preferences are about not being swayed while you can still bet, so
  // they switch off once the match is finished — then you see the full picture
  // (every option and its odds, with your pick marked a hit or a miss).
  const showOdds = !hideOdds || match.finished
  const types = visibleBetTypes(hideDoubleChance && !match.finished)

  return (
    <div className={`bet-grid${types.length === 3 ? ' grid-cols-3' : ''}`}>
      {types.map(([result, label]) => {
        const active = myAnswer === result
        const isScored = scored?.has(result) ?? false
        const odds = formattedOdds(match.odds[result])
        return (
          <button
            key={result}
            type="button"
            disabled={!interactive || pending}
            onClick={() => onBet?.(result)}
            aria-label={`Typ ${label}${showOdds ? `, kurs ${odds}` : ''}${
              active ? `, wybrany${match.finished ? (isScored ? ', trafiony' : ', nietrafiony') : ''}` : ''
            }`}
            className={betPillClass({ active, scored: isScored, finished: match.finished, interactive })}
          >
            <span className="bet-key">{label}</span>
            {showOdds && <span className="bet-odds">{odds}</span>}
          </button>
        )
      })}
    </div>
  )
}
