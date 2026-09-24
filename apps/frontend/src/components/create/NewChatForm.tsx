import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import type { PublicUser } from '@/types/api'
import { UserPicker } from './UserPicker'

export function NewChatForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (input: { type: 'direct' | 'group'; participantIds: string[]; title?: string }) => void
  isPending: boolean
  error?: string | null
}) {
  const [participants, setParticipants] = useState<PublicUser[]>([])
  const [title, setTitle] = useState('')

  const isGroup = participants.length > 1

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (participants.length === 0) return
    onSubmit({
      type: isGroup ? 'group' : 'direct',
      participantIds: participants.map((u) => u.id),
      title: isGroup ? title || undefined : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="To">
        <UserPicker selected={participants} onChange={setParticipants} multiple />
      </Field>
      {isGroup && (
        <Field label="Group name (optional)">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend trip" />
        </Field>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isPending || participants.length === 0}>
        {isPending ? 'Starting…' : 'Start chat'}
      </Button>
    </form>
  )
}
