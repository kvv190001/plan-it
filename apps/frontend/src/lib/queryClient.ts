import { MutationCache, QueryClient } from '@tanstack/react-query'

// Any successful mutation (RSVP, accepting a friend request, ...) can change
// the tab-bar notification dots, so refresh the summary globally.
export const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
