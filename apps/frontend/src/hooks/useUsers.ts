import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useApi } from '@/lib/api'
import type { PublicUser } from '@/types/api'

// Hydrates a set of user ids (chat participants, plan participants, comment
// authors) into public profiles via the batched GET /users?ids= endpoint.
export function useUsers(ids: string[]) {
  const api = useApi()
  const key = useMemo(() => [...new Set(ids)].sort(), [ids])

  const query = useQuery({
    queryKey: ['users', key],
    queryFn: () => api.users(key),
    enabled: key.length > 0,
  })

  const byId = useMemo(() => {
    const map = new Map<string, PublicUser>()
    for (const user of query.data ?? []) map.set(user.id, user)
    return map
  }, [query.data])

  return { ...query, byId }
}

export function useSearchUsers(query: string) {
  const api = useApi()
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => api.searchUsers(query),
    enabled: query.trim().length > 0,
  })
}
