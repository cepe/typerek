import type { BetType } from '@/api/types'

// The six bet types, in display order: [result, label]. Mirrors MatchesHelper::BET_TYPES.
export const BET_TYPES: ReadonlyArray<readonly [BetType, string]> = [
  ['win_a', '1'],
  ['tie', 'X'],
  ['win_b', '2'],
  ['win_tie_a', '1X'],
  ['win_tie_b', 'X2'],
  ['not_tie', '12'],
]

// CSS classes for an interactive bet pill. Mirrors MatchesHelper#bet_pill_class.
export function betPillClass(active: boolean, started: boolean): string {
  if (active) return `bet bet-active${started ? ' pointer-events-none' : ''}`
  if (started) return 'bet bet-locked'
  return 'bet bet-idle'
}
