import { SOCKET_EVENTS } from '@plan-it/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import type { Message } from '@/types/api'

export function useConversations() {
  const api = useApi()
  return useQuery({
    queryKey: ['conversations', 'list'],
    queryFn: () => api.conversations.list(),
  })
}

export function useCreateConversation() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: 'direct' | 'group'; participantIds: string[]; title?: string }) =>
      api.conversations.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] }),
  })
}

export function useMessages(conversationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.conversations.messages(conversationId!),
    enabled: !!conversationId,
  })
}

// Sends over the socket connection (real-time; see docs/04-api-design.md —
// message:send emits message:new to the room) rather than REST, since the
// socket path is already the primary one and avoids a duplicate round trip.
export function useSendMessage(conversationId: string) {
  const socket = useSocket()
  const api = useApi()
  return useMutation({
    mutationFn: async ({ content, planId }: { content: string; planId?: string }) => {
      if (socket?.connected) {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId, content, planId })
        return
      }
      // Fallback if the socket isn't connected yet.
      await api.conversations.sendMessage(conversationId, { content, planId })
    },
  })
}

export function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: Message,
) {
  queryClient.setQueryData<Message[]>(['messages', conversationId], (prev) =>
    prev ? [...prev.filter((m) => m.id !== message.id), message] : [message],
  )
  queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
}
