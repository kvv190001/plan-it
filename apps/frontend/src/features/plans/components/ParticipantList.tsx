import { Avatar } from '@/components/ui/Avatar'
import { Tag } from '@/components/ui/Tag'
import { useUsers } from '@/hooks/useUsers'
import type { PlanParticipant } from '@/types/api'

const rsvpTone = { pending: 'warning', accepted: 'success', declined: 'danger' } as const

export function ParticipantList({ participants }: { participants: PlanParticipant[] }) {
  const { byId } = useUsers(participants.map((p) => p.userId))

  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const user = byId.get(p.userId)
        return (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar src={user?.avatarUrl} name={user?.displayName} size="sm" />
            <span className="flex-1 text-sm font-medium text-gray-800">{user?.displayName ?? '…'}</span>
            {p.role === 'owner' ? (
              <Tag tone="neutral">Owner</Tag>
            ) : (
              <Tag tone={rsvpTone[p.rsvpStatus]}>{p.rsvpStatus}</Tag>
            )}
          </li>
        )
      })}
    </ul>
  )
}
