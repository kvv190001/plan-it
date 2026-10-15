import { ClerkProvider } from '@clerk/react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { PwaStatus } from '@/components/PwaStatus'
import { CacheGuard } from '@/lib/CacheGuard'
import { CACHE_MAX_AGE, persister, queryClient } from '@/lib/queryClient'
import { RealtimeSync } from '@/lib/realtimeSync'
import { SocketProvider } from '@/lib/socket'
import { router } from '@/routes/router'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// Bump when cached data shapes change to discard incompatible persisted caches.
const CACHE_BUSTER = 'v1'

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in" signUpUrl="/sign-up">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_BUSTER }}
      >
        <CacheGuard />
        <SocketProvider>
          <RealtimeSync />
          <PwaStatus />
          <RouterProvider router={router} />
        </SocketProvider>
      </PersistQueryClientProvider>
    </ClerkProvider>
  )
}
