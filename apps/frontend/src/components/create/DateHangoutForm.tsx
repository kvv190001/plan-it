import { createDatePlanSchema, createHangoutPlanSchema } from '@plan-it/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import type { PublicUser } from '@/types/api'
import { UserPicker } from './UserPicker'

interface DateHangoutFormProps {
  type: 'date' | 'hangout'
  onSubmit: (input: Record<string, unknown>) => void
  isPending: boolean
  error?: string | null
}

export function DateHangoutForm({ type, onSubmit, isPending, error }: DateHangoutFormProps) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [invitees, setInvitees] = useState<PublicUser[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const base = {
      type,
      title,
      location: location || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      notes: notes || undefined,
    }
    const input =
      type === 'date'
        ? { ...base, inviteeId: invitees[0]?.id }
        : { ...base, inviteeIds: invitees.map((u) => u.id) }

    const schema = type === 'date' ? createDatePlanSchema : createHangoutPlanSchema
    const parsed = schema.safeParse(input)
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
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner at Nonna's" required />
      </Field>
      <Field label="Location">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Date & time">
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
      </Field>
      <Field label={type === 'date' ? 'Invite' : 'Invite (one or more)'}>
        <UserPicker selected={invitees} onChange={setInvitees} multiple={type === 'hangout'} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </Field>

      {(formError || error) && <p className="text-sm text-red-600">{formError ?? error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? 'Creating…' : type === 'date' ? 'Create date' : 'Create hangout'}
      </Button>
    </form>
  )
}
