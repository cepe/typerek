import type { Match, MatchList } from '@/api/types'

// A finished match's result from one team's point of view. null while the match
// has no result yet, or when the team didn't play in it.
export type TeamOutcome = 'win' | 'draw' | 'loss'

export function teamOutcome(match: Match, team: string): TeamOutcome | null {
  if (match.result_a == null || match.result_b == null) return null
  if (match.team_a !== team && match.team_b !== team) return null
  const isA = match.team_a === team
  const own = isA ? match.result_a : match.result_b
  const opp = isA ? match.result_b : match.result_a
  if (own > opp) return 'win'
  if (own < opp) return 'loss'
  return 'draw'
}

export interface TeamRecord {
  played: number
  wins: number
  draws: number
  losses: number
}

// The team's win/draw/loss tally over the finished matches it played in.
export function teamRecord(matches: Match[], team: string): TeamRecord {
  const record: TeamRecord = { played: 0, wins: 0, draws: 0, losses: 0 }
  for (const match of matches) {
    const outcome = teamOutcome(match, team)
    if (!outcome) continue
    record.played += 1
    if (outcome === 'win') record.wins += 1
    else if (outcome === 'draw') record.draws += 1
    else record.losses += 1
  }
  return record
}

export interface TeamSchedule {
  finished: Match[]
  upcoming: Match[]
}

// Pull every match a team plays in out of the full match list, split into
// finished and upcoming and ordered chronologically (oldest first) so the two
// sections read as one timeline. The list already carries every match (see
// useMatches), so no extra request is needed.
export function teamSchedule(list: MatchList, team: string): TeamSchedule {
  const involves = (match: Match) => match.team_a === team || match.team_b === team
  const byStartAsc = (a: Match, b: Match) => new Date(a.start).getTime() - new Date(b.start).getTime()
  return {
    finished: list.finished.filter(involves).sort(byStartAsc),
    upcoming: list.not_finished.filter(involves).sort(byStartAsc),
  }
}

// Polish plural for "mecz": 1 mecz, 2-4 mecze, 5+ meczów (with the 12-14 exception).
export function matchCountLabel(count: number): string {
  if (count === 1) return '1 mecz'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} mecze`
  return `${count} meczów`
}
