import { SOCKET_EVENTS } from '@plan-it/shared'
import { useQueryClient } from '@tanstack/react-query'
import { appendMessageToCache } from '@/features/chats/hooks'
import { useSocketEvent } from '@/lib/socket'
import type { Message } from '@/types/api'

// Mounted once near the app root — bridges server-pushed Socket.io events
// (see docs/04-api-design.md) into React Query cache updates/invalidation
// so every screen stays live without polling.
export function RealtimeSync() {
  const queryClient = useQueryClient()

  useSocketEvent<{ message: Message }>(SOCKET_EVENTS.MESSAGE_NEW, ({ message }) => {
    appendMessageToCache(queryClient, message.conversationId, message)
  })

  useSocketEvent(SOCKET_EVENTS.PLAN_INVITED, () => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
  })

  useSocketEvent<{ planId: string }>(SOCKET_EVENTS.PLAN_RSVP_UPDATED, ({ planId }) => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'detail', planId] })
    queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
  })

  useSocketEvent<{ planId: string }>(SOCKET_EVENTS.PLAN_STATUS_CHANGED, ({ planId }) => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'detail', planId] })
    queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
  })

  useSocketEvent<{ planId: string }>(SOCKET_EVENTS.PLAN_MILESTONE_COMPLETED, ({ planId }) => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'detail', planId] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  })

  useSocketEvent<{ planId: string }>(SOCKET_EVENTS.PLAN_COMMENT_POSTED, ({ planId }) => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'comments', planId] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  })

  return null
}
