import type { QueryClient } from '@tanstack/react-query'
import api, { ApiClientError, apiErrorMessage, getToken } from '@/api/client'
import { queryKeys } from '@/api/hooks'
import type { BetType } from '@/api/types'
import type { ToolDescriptor, ToolResponse } from './types'

// Tool handlers act as the signed-in user: they reuse the JWT the SPA keeps in
// localStorage, read at call time, so signing in/out mid-session just works.

const NO_INPUT = { type: 'object', properties: {} } as const

const SIGN_IN_MESSAGE = 'Not signed in — sign in to Typerek in this tab first.'

function ok(data: unknown): ToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function err(message: string): ToolResponse {
  return { isError: true, content: [{ type: 'text', text: message }] }
}

async function authed(fn: () => Promise<unknown>): Promise<ToolResponse> {
  if (!getToken()) return err(SIGN_IN_MESSAGE)
  try {
    return ok(await fn())
  } catch (error) {
    // A 401 means the stored token went stale (the client clears it for us).
    if (error instanceof ApiClientError && error.status === 401) return err(SIGN_IN_MESSAGE)
    return err(apiErrorMessage(error, 'Request failed'))
  }
}

export function createTools(queryClient: QueryClient): ToolDescriptor[] {
  return [
    {
      name: 'list_matches',
      description:
        'List all matches in the Typerek betting pool, split into not_finished (upcoming or in progress; betting is open until a match starts) and finished. Each match has id, team_a, team_b, start time, started/finished flags, final result goals (result_a/result_b, null until finished), odds per bet type, and my_answer — your current bet, or null.',
      inputSchema: NO_INPUT,
      execute: () => authed(() => api.get('/matches')),
    },
    {
      name: 'get_match',
      description:
        "Get a single match by id, with odds and — once the match has started — every participant's bet.",
      inputSchema: {
        type: 'object',
        properties: { match_id: { type: 'number', description: 'Match id from list_matches' } },
        required: ['match_id'],
      },
      execute: (args) => {
        const { match_id } = args as { match_id: number }
        return authed(() => api.get(`/matches/${match_id}`))
      },
    },
    {
      name: 'get_ranking',
      description: 'Current leaderboard: position, user, points, and prediction accuracy per player.',
      inputSchema: NO_INPUT,
      execute: () => authed(() => api.get('/ranking')),
    },
    {
      name: 'get_ranking_history',
      description:
        'Leaderboard history: for each player, their position and points after every finished match, plus the list of those matches.',
      inputSchema: NO_INPUT,
      execute: () => authed(() => api.get('/ranking/history')),
    },
    {
      name: 'get_user_profile',
      description:
        "A player's profile: prediction accuracy and their bets on matches that have already started (bets on upcoming matches are private).",
      inputSchema: {
        type: 'object',
        properties: { user_id: { type: 'number', description: 'User id from get_ranking' } },
        required: ['user_id'],
      },
      execute: (args) => {
        const { user_id } = args as { user_id: number }
        return authed(() => api.get(`/users/${user_id}`))
      },
    },
    {
      name: 'place_bet',
      description:
        "Place or change the signed-in user's bet on a match that has not started yet. Bet types: win_a (team A wins), tie, win_b (team B wins), win_tie_a (team A wins or tie), win_tie_b (team B wins or tie), not_tie (either team wins). A correct bet earns the match's odds for that type as points; a wrong bet earns 0. Bets lock at match start.",
      inputSchema: {
        type: 'object',
        properties: {
          match_id: { type: 'number', description: 'Match id from list_matches' },
          result: {
            type: 'string',
            enum: ['win_a', 'tie', 'win_b', 'win_tie_a', 'win_tie_b', 'not_tie'],
            description: 'The outcome to bet on',
          },
        },
        required: ['match_id', 'result'],
      },
      execute: async (args) => {
        const { match_id, result } = args as { match_id: number; result: BetType }
        if (!getToken()) return err(SIGN_IN_MESSAGE)
        try {
          const answer = await api.put(`/matches/${match_id}/bet`, { result })
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.matches }),
            queryClient.invalidateQueries({ queryKey: queryKeys.match(match_id) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.me }),
          ])
          return ok(answer)
        } catch (error) {
          // Mirrors usePlaceBet: a 422 means the cached view is stale (the match
          // started), so refetch to lock the bet UI on any open page.
          if (error instanceof ApiClientError && error.status === 422) {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: queryKeys.matches }),
              queryClient.invalidateQueries({ queryKey: queryKeys.match(match_id) }),
            ])
          }
          return err(apiErrorMessage(error, 'Placing the bet failed'))
        }
      },
    },
    {
      name: 'get_me',
      description: 'The signed-in user: username, current points and rank.',
      inputSchema: NO_INPUT,
      execute: () => authed(() => api.get('/me')),
    },
  ]
}
