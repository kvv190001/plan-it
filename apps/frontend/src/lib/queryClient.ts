import { MutationCache, QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7
const CACHE_KEY = 'plan-it-query-cache'
const USER_KEY = 'plan-it-cache-user'

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
      // Must be >= the persister maxAge, otherwise restored data is garbage-collected.
      gcTime: CACHE_MAX_AGE,
      // Render cached data while offline instead of pausing into a loading state.
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
})

// IndexedDB (not localStorage): larger quota and non-blocking on iOS.
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: CACHE_KEY,
  throttleTime: 1000,
})

export const getCachedUserId = () => get<string>(USER_KEY)
export const setCachedUserId = (id: string) => set(USER_KEY, id)

export async function clearPersistedCache() {
  queryClient.clear()
  await Promise.all([del(CACHE_KEY), del(USER_KEY)])
}
