import { useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { clearPersistedCache, getCachedUserId, setCachedUserId } from '@/lib/queryClient'

// Keeps the persisted cache scoped to one user: wiped on sign-out and when a
// different user signs in on the same device.
export function CacheGuard() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !userId) {
      // Offline, Clerk may not be able to confirm the session; don't wipe then.
      if (navigator.onLine) void clearPersistedCache()
      return
    }
    void getCachedUserId().then(async (cached) => {
      if (cached && cached !== userId) await clearPersistedCache()
      await setCachedUserId(userId)
    })
  }, [isLoaded, isSignedIn, userId])

  return null
}
