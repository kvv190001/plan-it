import { createGoalPlanSchema } from '@plan-it/shared'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import type { PublicUser } from '@/types/api'
import { UserPicker } from './UserPicker'

export function GoalForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (input: Record<string, unknown>) => void
  isPending: boolean
  error?: string | null
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewers, setViewers] = useState<PublicUser[]>([])
  const [milestones, setMilestones] = useState<string[]>([''])
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = {
      type: 'goal' as const,
      title,
      description: description || undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      viewerIds: viewers.map((u) => u.id),
      milestones: milestones
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, position) => ({ title, position })),
    }
    const parsed = createGoalPlanSchema.safeParse(input)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Please check the form')
      return
    }
    setFormError(null)
    onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a 10k" required />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Target date">
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>

      <Field label="Milestones">
        <div className="space-y-2">
          {milestones.map((value, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(e) =>
                  setMilestones((prev) => prev.map((m, i) => (i === idx ? e.target.value : m)))
                }
                placeholder={`Milestone ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Remove milestone"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMilestones((prev) => [...prev, ''])}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
          >
            <Plus className="size-4" /> Add milestone
          </button>
        </div>
      </Field>

      <Field label="Support crew (optional)">
        <UserPicker selected={viewers} onChange={setViewers} multiple />
      </Field>

      {(formError || error) && <p className="text-sm text-red-600">{formError ?? error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create goal'}
      </Button>
    </form>
  )
}
