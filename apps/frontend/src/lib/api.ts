import { useAuth } from '@clerk/react'
import { useMemo } from 'react'
import type { CreatePlanInput } from '@plan-it/shared'
import type {
  ActivityEvent,
  Comment,
  Conversation,
  Message,
  Plan,
  PlanWithParticipants,
  PublicUser,
} from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL

export interface CurrentUser extends PublicUser {
  clerkUserId: string
  createdAt: string
}

type GetToken = () => Promise<string | null>

function qs(params?: Record<string, string | number | Date | undefined>) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, value instanceof Date ? value.toISOString() : String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

async function request<T>(getToken: GetToken, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Request failed with ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function createApiClient(getToken: GetToken) {
  const get = <T,>(path: string) => request<T>(getToken, path)
  const post = <T,>(path: string, body?: unknown) =>
    request<T>(getToken, path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
  const patch = <T,>(path: string, body?: unknown) =>
    request<T>(getToken, path, { method: 'PATCH', body: JSON.stringify(body) })
  const del = <T,>(path: string) => request<T>(getToken, path, { method: 'DELETE' })

  return {
    me: () => get<{ user: CurrentUser }>('/me').then((r) => r.user),

    users: (ids: string[]) =>
      ids.length === 0
        ? Promise.resolve([] as PublicUser[])
        : get<{ users: PublicUser[] }>(`/users${qs({ ids: ids.join(',') })}`).then((r) => r.users),

    searchUsers: (query: string) =>
      query.trim().length === 0
        ? Promise.resolve([] as PublicUser[])
        : get<{ users: PublicUser[] }>(`/users${qs({ q: query })}`).then((r) => r.users),

    conversations: {
      list: () => get<{ conversations: Conversation[] }>('/conversations').then((r) => r.conversations),
      create: (input: { type: 'direct' | 'group'; participantIds: string[]; title?: string }) =>
        post<{ conversation: Conversation }>('/conversations', input).then((r) => r.conversation),
      messages: (conversationId: string, params?: { before?: Date; limit?: number }) =>
        get<{ messages: Message[] }>(`/conversations/${conversationId}/messages${qs(params)}`).then(
          (r) => r.messages,
        ),
      sendMessage: (conversationId: string, input: { content: string; planId?: string }) =>
        post<{ message: Message }>(`/conversations/${conversationId}/messages`, input).then((r) => r.message),
    },

    plans: {
      list: (params?: { start?: Date; end?: Date; type?: string; status?: string }) =>
        get<{ plans: Plan[] }>(`/plans${qs(params)}`).then((r) => r.plans),
      get: (id: string) => get<{ plan: PlanWithParticipants }>(`/plans/${id}`).then((r) => r.plan),
      create: (input: CreatePlanInput) =>
        post<{ plan: PlanWithParticipants }>('/plans', input).then((r) => r.plan),
      update: (id: string, input: Record<string, unknown>) =>
        patch<{ plan: PlanWithParticipants }>(`/plans/${id}`, input).then((r) => r.plan),
      cancel: (id: string) => del<{ plan: PlanWithParticipants }>(`/plans/${id}`).then((r) => r.plan),
      invite: (id: string, userId: string) =>
        post<{ plan: PlanWithParticipants }>(`/plans/${id}/participants`, { userId }).then((r) => r.plan),
      removeParticipant: (id: string, userId: string) =>
        del<{ plan: PlanWithParticipants }>(`/plans/${id}/participants/${userId}`).then((r) => r.plan),
      rsvp: (id: string, status: 'accepted' | 'declined') =>
        post<{ plan: PlanWithParticipants }>(`/plans/${id}/rsvp`, { status }).then((r) => r.plan),
      addMilestone: (id: string, input: { title: string; position?: number }) =>
        post<{ plan: PlanWithParticipants }>(`/plans/${id}/milestones`, input).then((r) => r.plan),
      updateMilestone: (id: string, milestoneId: string, input: { title?: string; isDone?: boolean; position?: number }) =>
        patch<{ plan: PlanWithParticipants }>(`/plans/${id}/milestones/${milestoneId}`, input).then((r) => r.plan),
      removeMilestone: (id: string, milestoneId: string) =>
        del<{ plan: PlanWithParticipants }>(`/plans/${id}/milestones/${milestoneId}`).then((r) => r.plan),
      comments: {
        list: (id: string) => get<{ comments: Comment[] }>(`/plans/${id}/comments`).then((r) => r.comments),
        create: (id: string, content: string) =>
          post<{ comment: Comment }>(`/plans/${id}/comments`, { content }).then((r) => r.comment),
      },
    },

    activity: {
      list: (params?: { before?: Date; limit?: number }) =>
        get<{ events: ActivityEvent[] }>(`/activity${qs(params)}`).then((r) => r.events),
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export function useApi(): ApiClient {
  const { getToken } = useAuth()
  return useMemo(() => createApiClient(getToken), [getToken])
}
