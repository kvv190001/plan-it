import type { CreatePlanInput } from '@plan-it/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'

export function usePlans(params?: { start?: Date; end?: Date; type?: string; status?: string }) {
  const api = useApi()
  return useQuery({
    queryKey: ['plans', 'list', params],
    queryFn: () => api.plans.list(params),
  })
}

export function usePlan(id: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['plans', 'detail', id],
    queryFn: () => api.plans.get(id!),
    enabled: !!id,
  })
}

function useInvalidatePlans() {
  const queryClient = useQueryClient()
  return (planId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
    if (planId) queryClient.invalidateQueries({ queryKey: ['plans', 'detail', planId] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }
}

export function useCreatePlan() {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => api.plans.create(input),
    onSuccess: () => invalidate(),
  })
}

export function useUpdatePlan(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.plans.update(id, input),
    onSuccess: () => invalidate(id),
  })
}

export function useCancelPlan(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: () => api.plans.cancel(id),
    onSuccess: () => invalidate(id),
  })
}

export function useRsvp(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (status: 'accepted' | 'declined') => api.plans.rsvp(id, status),
    onSuccess: () => invalidate(id),
  })
}

export function useInviteParticipant(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (userId: string) => api.plans.invite(id, userId),
    onSuccess: () => invalidate(id),
  })
}

export function useRemoveParticipant(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (userId: string) => api.plans.removeParticipant(id, userId),
    onSuccess: () => invalidate(id),
  })
}

export function useAddMilestone(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (title: string) => api.plans.addMilestone(id, { title }),
    onSuccess: () => invalidate(id),
  })
}

export function useUpdateMilestone(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: ({ milestoneId, isDone }: { milestoneId: string; isDone: boolean }) =>
      api.plans.updateMilestone(id, milestoneId, { isDone }),
    onSuccess: () => invalidate(id),
  })
}

export function useRemoveMilestone(id: string) {
  const api = useApi()
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (milestoneId: string) => api.plans.removeMilestone(id, milestoneId),
    onSuccess: () => invalidate(id),
  })
}

export function useComments(planId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['plans', 'comments', planId],
    queryFn: () => api.plans.comments.list(planId!),
    enabled: !!planId,
  })
}

export function useAddComment(planId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => api.plans.comments.create(planId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'comments', planId] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
