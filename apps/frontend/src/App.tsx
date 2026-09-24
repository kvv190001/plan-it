import { ClerkProvider } from '@clerk/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { RealtimeSync } from '@/lib/realtimeSync'
import { SocketProvider } from '@/lib/socket'
import { router } from '@/routes/router'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in" signUpUrl="/sign-up">
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <RealtimeSync />
          <RouterProvider router={router} />
        </SocketProvider>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
