import { describe, expect, it } from 'vitest'
import type { Match, Odds } from '@/api/types'
import { parseRules, rulePick, scoreRules, type Rule } from './ruleStrategy'

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

// Parse a program for the tests, blowing up loudly if it doesn't compile.
function rules(source: string): Rule[] {
  const parsed = parseRules(source)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.rules
}

describe('parseRules', () => {
  it('parses a multi-rule program, ignoring blanks and comments', () => {
    const parsed = parseRules(`
      w1 < 1.3 & r > 5 => r   # juicy draw
      w1 < w2 => w1

      => w2
    `)
    expect(parsed).toMatchObject({ ok: true })
    if (parsed.ok) expect(parsed.rules).toHaveLength(3)
  })

  it('reports a friendly error for an unknown pick', () => {
    expect(parseRules('w1 < 1.3 => zz')).toMatchObject({ ok: false, error: expect.stringContaining('typ') })
  })

  it('reports a missing arrow, an unknown variable, and an empty program', () => {
    expect(parseRules('w1 < 1.3 r')).toMatchObject({ ok: false })
    expect(parseRules('foo < 1 => w1')).toMatchObject({ ok: false, error: expect.stringContaining('foo') })
    expect(parseRules('   ')).toMatchObject({ ok: false })
  })
})

describe('rulePick', () => {
  const program = rules(`
    w1 < 1.3 & r > 5 => r
    w1 < w2 => w1
    => w2
  `)

  it('returns the pick of the first matching rule', () => {
    // Big home favourite with a juicy draw price → the first rule fires.
    expect(rulePick(program, match({ odds: { ...NO_ODDS, win_a: 1.2, tie: 6, win_b: 12 } }))).toBe('tie')
    // Home favourite, draw not juicy → falls to the head-to-head rule.
    expect(rulePick(program, match({ odds: { ...NO_ODDS, win_a: 1.8, tie: 3.2, win_b: 4.1 } }))).toBe('win_a')
    // Away favourite → falls through to the default.
    expect(rulePick(program, match({ odds: { ...NO_ODDS, win_a: 4.1, tie: 3.2, win_b: 1.8 } }))).toBe('win_b')
  })

  it('treats a comparison against a missing odd as false and falls through', () => {
    // tie is null, so `r > 5` can't hold; w1 < w2 still does → win_a.
    expect(rulePick(program, match({ odds: { ...NO_ODDS, win_a: 1.2, win_b: 5 } }))).toBe('win_a')
  })

  it('returns null when nothing matches and there is no default', () => {
    expect(rulePick(rules('w1 < 1 => w1'), match({ odds: { ...NO_ODDS, win_a: 2 } }))).toBeNull()
  })
})

describe('scoreRules', () => {
  it('scores the odds of each winning pick and counts the hits', () => {
    const program = rules('w1 < w2 => w1\n=> w2')
    const finished = [
      // Home favourite, home wins → win_a @ 1.5.
      match({ id: 1, result_a: 2, result_b: 0, odds: { ...NO_ODDS, win_a: 1.5, win_b: 4 } }),
      // Away favourite (default), away wins → win_b @ 1.6.
      match({ id: 2, result_a: 0, result_b: 1, odds: { ...NO_ODDS, win_a: 4, win_b: 1.6 } }),
      // Home favourite but a draw → win_a misses, scores nothing.
      match({ id: 3, result_a: 1, result_b: 1, odds: { ...NO_ODDS, win_a: 1.4, win_b: 5 } }),
    ]
    expect(scoreRules(program, finished)).toEqual({ points: 3.1, accuracy: 2 })
  })

  it('scores zero for a match the rules make no pick on', () => {
    const m = match({ result_a: 2, result_b: 0, odds: { ...NO_ODDS, win_a: 1.5 } })
    expect(scoreRules(rules('w1 < 1 => w1'), [m])).toEqual({ points: 0, accuracy: 0 })
  })
})
