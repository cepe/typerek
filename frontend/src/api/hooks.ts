import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from './client'
import type {
  Answer,
  BetType,
  CurrentUser,
  InvitationCreated,
  InvitationInfo,
  MatchDetail,
  MatchList,
  RankingEntry,
  User,
  UserProfile,
} from './types'

export const queryKeys = {
  me: ['me'] as const,
  matches: ['matches'] as const,
  match: (id: number | string) => ['matches', String(id)] as const,
  ranking: ['ranking'] as const,
  users: ['users'] as const,
  user: (id: number | string) => ['users', String(id)] as const,
  invitation: (token: string) => ['invitations', token] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => (await api.get<MatchList>('/matches')).data,
  })
}

export function useMatch(id: number | string) {
  return useQuery({
    queryKey: queryKeys.match(id),
    queryFn: async () => (await api.get<MatchDetail>(`/matches/${id}`)).data,
  })
}

export function useRanking() {
  return useQuery({
    queryKey: queryKeys.ranking,
    queryFn: async () => (await api.get<RankingEntry[]>('/ranking')).data,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => (await api.get<User[]>('/users')).data,
  })
}

export function useUserProfile(id: number | string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => (await api.get<UserProfile>(`/users/${id}`)).data,
  })
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: async () => (await api.get<InvitationInfo>(`/invitations/${token}`)).data,
    retry: false,
  })
}

// ── Mutations ───────────────────────────────────────────────────────────────────
export function usePlaceBet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, result }: { matchId: number; result: BetType }) =>
      (await api.put<Answer>(`/matches/${matchId}/bet`, { result })).data,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.matches })
      qc.invalidateQueries({ queryKey: queryKeys.match(variables.matchId) })
      qc.invalidateQueries({ queryKey: queryKeys.me })
    },
    // A 422 means our cached view is stale — typically the match has since
    // started, so the server rejected the bet. Refetch to lock the now-started
    // match instead of leaving the pills clickable.
    onError: (error, variables) => {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        qc.invalidateQueries({ queryKey: queryKeys.matches })
        qc.invalidateQueries({ queryKey: queryKeys.match(variables.matchId) })
      }
    },
  })
}

export function useUpdateMatch(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (attributes: Record<string, unknown>) =>
      (await api.put<MatchDetail>(`/matches/${id}`, attributes)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matches })
      qc.invalidateQueries({ queryKey: queryKeys.match(id) })
    },
  })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (username: string) =>
      (await api.post<InvitationCreated>('/users', { username })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<InvitationCreated>(`/users/${id}/resend-invitation`)).data,
  })
}

export function useToggleFin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.patch<User>(`/users/${id}/fin`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

// Used by the standing in the header; exported for explicit refreshes.
export async function fetchMe(): Promise<CurrentUser> {
  return (await api.get<CurrentUser>('/me')).data
}
