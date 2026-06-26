import type { BetType, Match } from '@/api/types'
import { winningBets } from './bets'

// The seeded strategy only ever draws among the three basic outcomes: 1 / X / 2.
const OUTCOMES: BetType[] = ['win_a', 'tie', 'win_b']

// FNV-1a 32-bit hash of a string → unsigned int. Small, synchronous and stable,
// which is all the seeded picks need.
function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// The strategy's pick for one match. It depends only on (seed, matchId), so each
// match's pick is fixed and independent of the others — adding a finished match
// never shifts the picks already made, and "the best seed" stays well-defined.
export function seededPick(seed: string, matchId: number): BetType {
  return OUTCOMES[hash32(`${seed}|${matchId}`) % 3]
}

export interface SeedScore {
  points: number
  accuracy: number
}

// Score a seed over the finished matches with the same rule as a real bet: a pick
// earns the match's odds for it when that outcome won, otherwise nothing. Mirrors
// Typerek::Ranking::VirtualPlayers#score (odds rounded to 2dp, as in the backend).
export function scoreSeed(seed: string, finished: Match[]): SeedScore {
  let points = 0
  let accuracy = 0
  for (const match of finished) {
    const pick = seededPick(seed, match.id)
    if (!winningBets(match.result_a, match.result_b).includes(pick)) continue
    const odds = match.odds[pick]
    if (odds == null) continue
    points += Math.round(odds * 100) / 100
    accuracy += 1
  }
  return { points: Math.round(points * 100) / 100, accuracy }
}

// A short random seed for the "roll the dice" button.
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8)
}
