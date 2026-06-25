// TypeScript types mirroring the schemas in ../../../openapi.yaml. These can later
// be generated automatically with openapi-typescript; for now they are kept in
// sync by hand.

import type { ThemePreference } from '@/lib/theme'

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
  // Opt-in master switch for Web Push notifications.
  push_enabled: boolean
  // Which kinds of push the user wants (only relevant when push_enabled). Default on.
  push_results: boolean
  push_reminders: boolean
  // Colour theme: 'light' (off), 'dark' (always), or 'auto' (dark at night).
  theme: ThemePreference
  // IDs of users the viewer starred as favourites in the ranking. They are
  // highlighted in the ranking and in a match's participant ("typy") list.
  favorite_user_ids: number[]
  // Order a match's participant list by ranking position instead of alphabetically.
  match_order_by_ranking: boolean
  // Show the naive benchmark "players" interleaved in the ranking.
  virtual_players: boolean
}

// A registered Web Push device for the signed-in user (GET /push/subscriptions).
export interface PushDevice {
  id: number
  endpoint: string
  user_agent: string | null
  created_at: string
}

export interface CurrentUser {
  id: number
  username: string
  admin: boolean
  standing: Standing | null
  // How many top places are rewarded this season — the "prize zone" the ranking
  // and the bump chart highlight. An app-level constant, same for everyone.
  rewarded_positions: number
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
  // The participant's current ranking position and points, used to optionally order
  // the list by standings (the match_order_by_ranking setting) and show how a
  // correct bet would move them. null if not ranked.
  position: number | null
  points: number | null
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
  // Position before the most recent finished match, for the movement arrow; null
  // until there is a prior ranking to compare against.
  previous_position: number | null
  user: { id: number; username: string }
  points: number
  accuracy: number
}

// A naive benchmark strategy scored over the finished matches, shown interleaved
// in the ranking when the virtual_players setting is on. Has no user account.
export interface VirtualPlayer {
  key: string
  username: string
  points: number
  accuracy: number
}

export interface Ranking {
  entries: RankingEntry[]
  // The season's point ceiling — what a flawless tipster could have scored on the
  // finished matches. 0 until at least one match has finished. Used to show each
  // player's points as a share of the maximum obtainable.
  perfect_score: number
  virtual_players: VirtualPlayer[]
}

export interface UserProfileMatch extends Match {
  answer: BetType | null
}

export interface UserProfile {
  user: { id: number; username: string; accuracy: number }
  started_matches: UserProfileMatch[]
}

// A virtual benchmark strategy's profile: its totals plus its pick on every
// started match, so its hits and misses can be shown like a real player's.
export interface VirtualPlayerProfile {
  player: { key: string; username: string; points: number; accuracy: number }
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
