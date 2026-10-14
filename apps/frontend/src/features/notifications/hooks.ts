import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'

export function useNotificationSummary() {
  const api = useApi()
  return useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: () => api.notifications.summary(),
    refetchOnWindowFocus: true,
  })
}

export function useMarkConversationRead() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => api.conversations.markRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkActivitySeen() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.activity.markSeen(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
