import { useAuth } from '@clerk/react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!isSignedIn) return <Navigate to="/sign-in" replace />

  return <>{children}</>
}
