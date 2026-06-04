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

// Human-readable meaning of each symbol, shown as the aligned legend above the
// pills (mirrors the column headers in Ania's typerek).
export const BET_LEGEND: Record<BetType, string> = {
  win_a: 'Drużyna 1',
  tie: 'Remis',
  win_b: 'Drużyna 2',
  win_tie_a: '1 lub X',
  win_tie_b: 'X lub 2',
  not_tie: '1 lub 2',
}

// The bet types that score points for a finished match. Mirrors Match#winning_list.
export function winningBets(resultA: number | null, resultB: number | null): BetType[] {
  if (resultA == null || resultB == null) return []
  if (resultA > resultB) return ['win_a', 'win_tie_a', 'not_tie']
  if (resultA < resultB) return ['win_b', 'win_tie_b', 'not_tie']
  return ['tie', 'win_tie_a', 'win_tie_b']
}

interface PillState {
  // The viewer picked this bet type.
  active: boolean
  // Finished match and this bet type scored points.
  scored: boolean
  // The match has a final result.
  finished: boolean
  // The pill can be clicked (an open match the viewer may bet on).
  interactive: boolean
}

// CSS classes for one bet pill.
// - Finished match: the viewer's own pick is strong green when it scored, red
//   when it missed; every other pill stays neutral.
// - Otherwise: the viewer's pick is a neutral gray ("picked, result unknown"),
//   open pills are idle, and a started-but-unfinished match locks the rest.
export function betPillClass({ active, scored, finished, interactive }: PillState): string {
  if (finished) {
    if (active) return scored ? 'bet bet-hit' : 'bet bet-miss'
    return 'bet bet-locked'
  }
  if (active) return `bet bet-pick${interactive ? '' : ' pointer-events-none'}`
  if (interactive) return 'bet bet-idle'
  return 'bet bet-locked'
}
