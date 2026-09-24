import { Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import type { GoalMilestone } from '@/types/api'
import { useAddMilestone, useRemoveMilestone, useUpdateMilestone } from '../hooks'

export function MilestoneList({ planId, milestones, canEdit }: { planId: string; milestones: GoalMilestone[]; canEdit: boolean }) {
  const updateMilestone = useUpdateMilestone(planId)
  const removeMilestone = useRemoveMilestone(planId)
  const addMilestone = useAddMilestone(planId)
  const [newTitle, setNewTitle] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    addMilestone.mutate(newTitle.trim(), { onSuccess: () => setNewTitle('') })
  }

  return (
    <div className="space-y-2">
      {milestones
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((milestone) => (
          <div key={milestone.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <button
              onClick={() => canEdit && updateMilestone.mutate({ milestoneId: milestone.id, isDone: !milestone.isDone })}
              disabled={!canEdit}
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                milestone.isDone ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300',
              )}
              aria-label={milestone.isDone ? 'Mark undone' : 'Mark done'}
            >
              {milestone.isDone && <Check className="size-4" />}
            </button>
            <span className={cn('flex-1 text-sm', milestone.isDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
              {milestone.title}
            </span>
            {canEdit && (
              <button
                onClick={() => removeMilestone.mutate(milestone.id)}
                className="text-gray-300 hover:text-red-500"
                aria-label="Remove milestone"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}

      {canEdit && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a milestone" />
          <button
            type="submit"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600"
            aria-label="Add milestone"
          >
            <Plus className="size-4" />
          </button>
        </form>
      )}
    </div>
  )
}
