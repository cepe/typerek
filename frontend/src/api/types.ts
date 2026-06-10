// TypeScript types mirroring the schemas in ../../../openapi.yaml. These can later
// be generated automatically with openapi-typescript; for now they are kept in
// sync by hand.

export type BetType = 'win_a' | 'tie' | 'win_b' | 'win_tie_a' | 'win_tie_b' | 'not_tie'

export interface Odds {
  win_a: number | null
  tie: number | null
  win_b: number | null
  win_tie_a: number | null
  win_tie_b: number | null
  not_tie: number | null
}

export interface Standing {
  rank: number | null
  points: number
}

// Per-user UI preferences, persisted server-side (see UserSettings on the backend).
export interface UserSettings {
  drzewko_mode: boolean
  bet_lock: boolean
}

export interface CurrentUser {
  id: number
  username: string
  admin: boolean
  standing: Standing | null
  // Community Discord invite, served only to signed-in users; null when unset.
  discord_url: string | null
  settings: UserSettings
}

export interface User {
  id: number
  username: string
  admin: boolean
  active: boolean
  fin: boolean
  invited_by: string | null
}

export interface Match {
  id: number
  team_a: string
  team_b: string
  start: string
  started: boolean
  finished: boolean
  result_a: number | null
  result_b: number | null
  odds: Odds
  my_answer: BetType | null
  // Whether the viewer locked their bet against accidental changes.
  my_locked: boolean
}

export interface Participant {
  user: { id: number; username: string }
  result: BetType | null
}

export interface MatchDetail extends Match {
  participants?: Participant[]
}

export interface MatchList {
  not_finished: Match[]
  finished: Match[]
}

export interface Answer {
  match_id: number
  result: BetType
  locked: boolean
}

export interface RankingEntry {
  position: number
  user: { id: number; username: string }
  points: number
  accuracy: number
}

export interface UserProfileMatch extends Match {
  answer: BetType | null
}

export interface UserProfile {
  user: { id: number; username: string; accuracy: number }
  started_matches: UserProfileMatch[]
}

export interface InvitationInfo {
  username: string
}

export interface InvitationCreated {
  user: User
  token: string
  url: string
}

export interface RankingHistoryMatch {
  id: number
  team_a: string
  team_b: string
  result_a: number | null
  result_b: number | null
  start: string
}

export interface RankingHistorySeries {
  user: { id: number; username: string }
  positions: number[]
  points: number[]
}

export interface RankingHistory {
  matches: RankingHistoryMatch[]
  series: RankingHistorySeries[]
}

export interface AuthResult {
  token: string
  user: CurrentUser
}

export interface ApiError {
  error: {
    code: string
    message: string
    fields?: Record<string, string[]>
  }
}
