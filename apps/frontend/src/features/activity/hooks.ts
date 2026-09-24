import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'

export function useActivity() {
  const api = useApi()
  return useQuery({
    queryKey: ['activity'],
    queryFn: () => api.activity.list({ limit: 50 }),
  })
}
