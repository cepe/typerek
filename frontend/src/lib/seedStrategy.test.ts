import { describe, expect, it } from 'vitest'
import type { BetType, Match, Odds } from '@/api/types'
import { randomSeed, scoreSeed, seededPick } from './seedStrategy'

const NO_ODDS: Odds = { win_a: null, tie: null, win_b: null, win_tie_a: null, win_tie_b: null, not_tie: null }

function match(overrides: Partial<Match>): Match {
  return {
    id: 1,
    team_a: 'A',
    team_b: 'B',
    start: '2026-06-12T18:00:00Z',
    started: true,
    finished: true,
    result_a: 0,
    result_b: 0,
    odds: NO_ODDS,
    my_answer: null,
    my_locked: false,
    ...overrides,
  }
}

// A result that makes the given basic pick the winning outcome.
function winningResult(pick: BetType): Partial<Match> {
  if (pick === 'win_a') return { result_a: 2, result_b: 0 }
  if (pick === 'win_b') return { result_a: 0, result_b: 2 }
  return { result_a: 1, result_b: 1 }
}

describe('seededPick', () => {
  it('is deterministic and only ever draws 1 / X / 2', () => {
    expect(seededPick('messi', 7)).toBe(seededPick('messi', 7))
    expect(['win_a', 'tie', 'win_b']).toContain(seededPick('whatever', 42))
  })
})

describe('scoreSeed', () => {
  it('scores the odds of a seeded pick when it wins', () => {
    const seed = 'messi2026'
    const pick = seededPick(seed, 7)
    const m = match({ id: 7, ...winningResult(pick), odds: { ...NO_ODDS, [pick]: 2.5 } })
    expect(scoreSeed(seed, [m])).toEqual({ points: 2.5, accuracy: 1 })
  })

  it('scores zero when the seeded pick loses', () => {
    const seed = 'abc'
    const pick = seededPick(seed, 3)
    // Flip the result so the pick is not in the winning list.
    const losing: Partial<Match> = pick === 'tie' ? { result_a: 1, result_b: 0 } : winningResult(pick === 'win_a' ? 'win_b' : 'win_a')
    const m = match({ id: 3, ...losing, odds: { ...NO_ODDS, [pick]: 2.5 } })
    expect(scoreSeed(seed, [m])).toEqual({ points: 0, accuracy: 0 })
  })

  it('is stable for the same seed', () => {
    const finished = [
      match({ id: 1, result_a: 2, result_b: 0, odds: { ...NO_ODDS, win_a: 1.8, tie: 3.2, win_b: 4.1 } }),
      match({ id: 2, result_a: 1, result_b: 1, odds: { ...NO_ODDS, win_a: 2.0, tie: 3.0, win_b: 3.5 } }),
      match({ id: 3, result_a: 0, result_b: 3, odds: { ...NO_ODDS, win_a: 5.0, tie: 3.4, win_b: 1.6 } }),
    ]
    expect(scoreSeed('lewy', finished)).toEqual(scoreSeed('lewy', finished))
  })
})

describe('randomSeed', () => {
  it('returns a non-empty alphanumeric string', () => {
    expect(randomSeed()).toMatch(/^[a-z0-9]+$/)
  })
})
