import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'

// Backend-local user row (synced from Clerk via webhook) for the signed-in
// user — needed for ids like `plans.createdBy` / `messages.senderId` to
// compare "is this me?" throughout the UI.
export function useCurrentUser() {
  const { isSignedIn } = useAuth()
  const api = useApi()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    enabled: isSignedIn,
    // The local `users` row is populated by an async webhook right after
    // sign-up, so a 404 immediately after signing up is expected/transient.
    retry: (failureCount, error) => failureCount < 5 && error.message !== 'Unauthorized',
    retryDelay: 1000,
  })
}
