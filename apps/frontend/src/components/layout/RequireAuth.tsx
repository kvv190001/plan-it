import { useAuth } from '@clerk/react'
import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hasCachedSession } from '@/lib/queryClient'

const CLERK_LOAD_TIMEOUT_MS = 3000

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const t = setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [isLoaded])

  if (!isLoaded) {
    // Clerk can't load offline; render from the persisted cache if this device had a session.
    if (hasCachedSession() && (!navigator.onLine || timedOut)) return <>{children}</>
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!isSignedIn) return <Navigate to="/sign-in" replace />

  return <>{children}</>
}
