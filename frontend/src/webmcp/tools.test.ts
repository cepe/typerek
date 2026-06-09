import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

// Mock only the network surface and token; keep ApiClientError/apiErrorMessage real.
vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    getToken: vi.fn(() => 'jwt-token'),
  }
})

import api, { ApiClientError, getToken } from '@/api/client'
import { createTools } from './tools'

function setup() {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const tools = createTools(queryClient)
  const tool = (name: string) => {
    const found = tools.find((t) => t.name === name)
    if (!found) throw new Error(`tool ${name} not registered`)
    return found
  }
  return { tools, tool, invalidate }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getToken).mockReturnValue('jwt-token')
})

describe('createTools', () => {
  it('exposes exactly the 7 spec tools', () => {
    const { tools } = setup()
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_match',
      'get_me',
      'get_ranking',
      'get_ranking_history',
      'get_user_profile',
      'list_matches',
      'place_bet',
    ])
  })

  it.each([
    ['list_matches', {}, '/matches'],
    ['get_match', { match_id: 7 }, '/matches/7'],
    ['get_ranking', {}, '/ranking'],
    ['get_ranking_history', {}, '/ranking/history'],
    ['get_user_profile', { user_id: 3 }, '/users/3'],
    ['get_me', {}, '/me'],
  ])('%s GETs %s and returns the JSON as text', async (name, args, path) => {
    const { tool } = setup()
    const payload = { some: 'data' }
    vi.mocked(api.get).mockResolvedValue(payload)

    const result = await tool(name).execute(args)

    expect(api.get).toHaveBeenCalledWith(path)
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toEqual(payload)
  })

  it('returns isError when not signed in, without calling the API', async () => {
    const { tool } = setup()
    vi.mocked(getToken).mockReturnValue(null)

    const result = await tool('list_matches').execute({})

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/sign in/i)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('treats a 401 (stale token) as not signed in', async () => {
    const { tool } = setup()
    vi.mocked(api.get).mockRejectedValue(new ApiClientError(401, null))

    const result = await tool('list_matches').execute({})

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/sign in/i)
  })

  it('maps API errors to isError with the server message', async () => {
    const { tool } = setup()
    vi.mocked(api.get).mockRejectedValue(
      new ApiClientError(404, { error: { code: 'not_found', message: 'Match not found' } }),
    )

    const result = await tool('get_match').execute({ match_id: 999 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Match not found')
  })
})

describe('place_bet', () => {
  it('PUTs the bet and invalidates matches, the match, and me', async () => {
    const { tool, invalidate } = setup()
    vi.mocked(api.put).mockResolvedValue({ match_id: 7, result: 'win_a' })

    const result = await tool('place_bet').execute({ match_id: 7, result: 'win_a' })

    expect(api.put).toHaveBeenCalledWith('/matches/7/bet', { result: 'win_a' })
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toEqual({ match_id: 7, result: 'win_a' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['matches'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['matches', '7'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] })
  })

  it('on 422 (match started) returns the server message and refreshes match caches', async () => {
    const { tool, invalidate } = setup()
    vi.mocked(api.put).mockRejectedValue(
      new ApiClientError(422, { error: { code: 'match_started', message: 'Match already started' } }),
    )

    const result = await tool('place_bet').execute({ match_id: 7, result: 'tie' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Match already started')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['matches'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['matches', '7'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['me'] })
  })

  it('requires sign-in', async () => {
    const { tool } = setup()
    vi.mocked(getToken).mockReturnValue(null)

    const result = await tool('place_bet').execute({ match_id: 7, result: 'win_a' })

    expect(result.isError).toBe(true)
    expect(api.put).not.toHaveBeenCalled()
  })
})
