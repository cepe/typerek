import { BET_TYPES, betPillClass } from '@/lib/bets'
import { formattedOdds } from '@/lib/format'
import type { BetType, Match } from '@/api/types'

interface Props {
  match: Match
  myAnswer: BetType | null
  // When omitted (or the match has started) the grid is read-only.
  onBet?: (result: BetType) => void
  pending?: boolean
}

// The 1 / X / 2 / 1X / X2 / 12 row. Mirrors matches/_buttons.html.erb: a started
// match locks the pills; the chosen pill is highlighted.
export default function BetGrid({ match, myAnswer, onBet, pending }: Props) {
  return (
    <div className="bet-grid">
      {BET_TYPES.map(([result, label]) => {
        const active = myAnswer === result
        const odds = formattedOdds(match.odds[result])
        const locked = match.started
        return (
          <button
            key={result}
            type="button"
            disabled={locked || pending || !onBet}
            onClick={() => onBet?.(result)}
            aria-label={`Typ ${label}, kurs ${odds}${active ? ', wybrany' : ''}`}
            className={betPillClass(active, locked)}
          >
            <span className="bet-key">{label}</span>
            <span className="bet-odds">{odds}</span>
          </button>
        )
      })}
    </div>
  )
}
