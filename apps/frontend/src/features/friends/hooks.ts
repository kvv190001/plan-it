import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'

export function useFriends() {
  const api = useApi()
  return useQuery({ queryKey: ['friends', 'list'], queryFn: () => api.friends.list() })
}

export function useFriendRequests() {
  const api = useApi()
  return useQuery({ queryKey: ['friends', 'requests'], queryFn: () => api.friends.requests() })
}

export function useMyFriendCode() {
  const api = useApi()
  return useQuery({ queryKey: ['friends', 'code'], queryFn: () => api.friends.code() })
}

function useInvalidateFriends() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['friends'] })
}

export function useSendFriendRequest() {
  const api = useApi()
  const invalidate = useInvalidateFriends()
  return useMutation({
    mutationFn: (friendCode: string) => api.friends.sendRequest(friendCode),
    onSuccess: invalidate,
  })
}

export function useAcceptFriendRequest() {
  const api = useApi()
  const invalidate = useInvalidateFriends()
  return useMutation({ mutationFn: (id: string) => api.friends.accept(id), onSuccess: invalidate })
}

export function useDeclineFriendRequest() {
  const api = useApi()
  const invalidate = useInvalidateFriends()
  return useMutation({ mutationFn: (id: string) => api.friends.decline(id), onSuccess: invalidate })
}

export function useRemoveFriend() {
  const api = useApi()
  const invalidate = useInvalidateFriends()
  return useMutation({ mutationFn: (userId: string) => api.friends.remove(userId), onSuccess: invalidate })
}

export function useRegenerateFriendCode() {
  const api = useApi()
  const invalidate = useInvalidateFriends()
  return useMutation({ mutationFn: () => api.friends.regenerateCode(), onSuccess: invalidate })
}
