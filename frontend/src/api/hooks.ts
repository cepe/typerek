import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { ApiClientError } from './client'
import type {
  Answer,
  BetType,
  CurrentUser,
  InvitationCreated,
  InvitationInfo,
  MatchDetail,
  MatchList,
  RankingEntry,
  RankingHistory,
  User,
  UserProfile,
} from './types'

export const queryKeys = {
  me: ['me'] as const,
  matches: ['matches'] as const,
  match: (id: number | string) => ['matches', String(id)] as const,
  ranking: ['ranking'] as const,
  rankingHistory: ['ranking', 'history'] as const,
  users: ['users'] as const,
  user: (id: number | string) => ['users', String(id)] as const,
  invitation: (token: string) => ['invitations', token] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: () => api.get<MatchList>('/matches'),
  })
}

export function useMatch(id: number | string) {
  return useQuery({
    queryKey: queryKeys.match(id),
    queryFn: () => api.get<MatchDetail>(`/matches/${id}`),
  })
}

export function useRanking() {
  return useQuery({
    queryKey: queryKeys.ranking,
    queryFn: () => api.get<RankingEntry[]>('/ranking'),
  })
}

export function useRankingHistory(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rankingHistory,
    queryFn: () => api.get<RankingHistory>('/ranking/history'),
    enabled,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<User[]>('/users'),
  })
}

export function useUserProfile(id: number | string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => api.get<UserProfile>(`/users/${id}`),
  })
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: () => api.get<InvitationInfo>(`/invitations/${token}`),
    retry: false,
  })
}

// ── Mutations ───────────────────────────────────────────────────────────────────
export function usePlaceBet() {
  const qc = useQueryClient()
  const setMyAnswer = (matchId: number, result: BetType | null) => {
    qc.setQueryData<MatchList>(queryKeys.matches, (list) =>
      list && {
        not_finished: list.not_finished.map((m) => (m.id === matchId ? { ...m, my_answer: result } : m)),
        finished: list.finished.map((m) => (m.id === matchId ? { ...m, my_answer: result } : m)),
      },
    )
    qc.setQueryData<MatchDetail>(queryKeys.match(matchId), (m) => m && { ...m, my_answer: result })
  }

  return useMutation({
    mutationFn: ({ matchId, result }: { matchId: number; result: BetType }) =>
      api.put<Answer>(`/matches/${matchId}/bet`, { result }),
    // A bet only ever changes the match's my_answer, so we patch it into the
    // cache straight away. The picked pill highlights on click instead of after a
    // full /matches refetch, and there is nothing else to reconcile — so unlike
    // the other mutations this one deliberately never invalidates on success.
    onMutate: async ({ matchId, result }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.matches }),
        qc.cancelQueries({ queryKey: queryKeys.match(matchId) }),
      ])
      const previous = {
        matches: qc.getQueryData<MatchList>(queryKeys.matches),
        match: qc.getQueryData<MatchDetail>(queryKeys.match(matchId)),
      }
      setMyAnswer(matchId, result)
      return previous
    },
    // Roll back the optimistic pick on failure. A 422 means our cached view is
    // stale — typically the match has since started, so the server rejected the
    // bet; refetch to lock the now-started match instead of leaving the pills
    // clickable.
    onError: (error, variables, previous) => {
      qc.setQueryData(queryKeys.matches, previous?.matches)
      qc.setQueryData(queryKeys.match(variables.matchId), previous?.match)
      if (error instanceof ApiClientError && error.status === 422) {
        qc.invalidateQueries({ queryKey: queryKeys.matches })
        qc.invalidateQueries({ queryKey: queryKeys.match(variables.matchId) })
      }
    },
  })
}

// Locks or unlocks the viewer's bet on a match so it can't be changed by accident.
export function useToggleLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, locked }: { matchId: number; locked: boolean }) =>
      api.put<Answer>(`/matches/${matchId}/lock`, { locked }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.matches })
      qc.invalidateQueries({ queryKey: queryKeys.match(variables.matchId) })
    },
  })
}

export function useUpdateMatch(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attributes: Record<string, unknown>) => api.put<MatchDetail>(`/matches/${id}`, attributes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matches })
      qc.invalidateQueries({ queryKey: queryKeys.match(id) })
      qc.invalidateQueries({ queryKey: queryKeys.ranking })
      qc.invalidateQueries({ queryKey: queryKeys.rankingHistory })
    },
  })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => api.post<InvitationCreated>('/users', { username }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (id: number) => api.post<InvitationCreated>(`/users/${id}/resend-invitation`),
  })
}

export function useToggleFin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch<User>(`/users/${id}/fin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

// Used by the standing in the header; exported for explicit refreshes.
export function fetchMe(): Promise<CurrentUser> {
  return api.get<CurrentUser>('/me')
}
