import { describe, expect, it } from 'vitest'
import type { Match, MatchList } from '@/api/types'
import { matchCountLabel, teamOutcome, teamRecord, teamSchedule } from './teams'

// Minimal match factory — only the fields the team helpers read matter.
function match(overrides: Partial<Match>): Match {
  return {
    id: 1,
    team_a: 'Polska',
    team_b: 'Niemcy',
    start: '2026-06-12T18:00:00Z',
    started: true,
    finished: false,
    result_a: null,
    result_b: null,
    odds: { win_a: null, tie: null, win_b: null, win_tie_a: null, win_tie_b: null, not_tie: null },
    my_answer: null,
    my_locked: false,
    ...overrides,
  }
}

describe('teamOutcome', () => {
  it('reads the result from the chosen team’s side', () => {
    const m = match({ team_a: 'Polska', team_b: 'Niemcy', result_a: 2, result_b: 0, finished: true })
    expect(teamOutcome(m, 'Polska')).toBe('win')
    expect(teamOutcome(m, 'Niemcy')).toBe('loss')
  })

  it('treats equal scores as a draw', () => {
    const m = match({ result_a: 1, result_b: 1, finished: true })
    expect(teamOutcome(m, 'Polska')).toBe('draw')
    expect(teamOutcome(m, 'Niemcy')).toBe('draw')
  })

  it('returns null when unfinished or the team did not play', () => {
    expect(teamOutcome(match({ result_a: null, result_b: null }), 'Polska')).toBeNull()
    expect(teamOutcome(match({ result_a: 2, result_b: 0, finished: true }), 'Brazylia')).toBeNull()
  })
})

describe('teamRecord', () => {
  it('tallies wins, draws and losses for the team', () => {
    const matches = [
      match({ id: 1, team_a: 'Polska', team_b: 'A', result_a: 2, result_b: 0, finished: true }),
      match({ id: 2, team_a: 'B', team_b: 'Polska', result_a: 1, result_b: 1, finished: true }),
      match({ id: 3, team_a: 'Polska', team_b: 'C', result_a: 0, result_b: 3, finished: true }),
      match({ id: 4, team_a: 'D', team_b: 'E', result_a: 1, result_b: 0, finished: true }),
    ]
    expect(teamRecord(matches, 'Polska')).toEqual({ played: 3, wins: 1, draws: 1, losses: 1 })
  })
})

describe('teamSchedule', () => {
  it('keeps only the team’s matches, split and ordered oldest-first', () => {
    const list: MatchList = {
      not_finished: [
        match({ id: 10, team_a: 'Polska', team_b: 'X', start: '2026-06-25T18:00:00Z' }),
        match({ id: 11, team_a: 'Y', team_b: 'Z', start: '2026-06-24T18:00:00Z' }),
      ],
      finished: [
        match({ id: 20, team_a: 'W', team_b: 'Polska', start: '2026-06-16T18:00:00Z', result_a: 0, result_b: 1, finished: true }),
        match({ id: 21, team_a: 'Polska', team_b: 'V', start: '2026-06-12T18:00:00Z', result_a: 2, result_b: 0, finished: true }),
      ],
    }
    const schedule = teamSchedule(list, 'Polska')
    expect(schedule.upcoming.map((m) => m.id)).toEqual([10])
    expect(schedule.finished.map((m) => m.id)).toEqual([21, 20])
  })
})

describe('matchCountLabel', () => {
  it('uses the right Polish plural form', () => {
    expect(matchCountLabel(1)).toBe('1 mecz')
    expect(matchCountLabel(3)).toBe('3 mecze')
    expect(matchCountLabel(5)).toBe('5 meczów')
    expect(matchCountLabel(12)).toBe('12 meczów')
    expect(matchCountLabel(22)).toBe('22 mecze')
  })
})
