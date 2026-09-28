import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUsers } from '@/hooks/useUsers'
import { usePlans } from '@/features/plans/hooks'
import { formatRelativeTime } from '@/lib/format'
import type { Conversation, Plan } from '@/types/api'
import { ActivePlanCard } from './components/ActivePlanCard'
import { useConversations } from './hooks'

const MAX_ACTIVE_PLANS = 5

function sortableTime(plan: Plan) {
  if (plan.type === 'goal') return plan.startDate ? new Date(plan.startDate).getTime() : Number.POSITIVE_INFINITY
  return new Date(plan.details.scheduledAt).getTime()
}

function useActivePlans() {
  const { data: plans } = usePlans()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  return (plans ?? [])
    .filter((plan) =>
      plan.type === 'goal'
        ? plan.displayStatus === 'active'
        : plan.displayStatus === 'confirmed' && new Date(plan.details.scheduledAt) >= startOfToday,
    )
    .sort((a, b) => sortableTime(a) - sortableTime(b))
    .slice(0, MAX_ACTIVE_PLANS)
}

function conversationLabel(conversation: Conversation, myId: string | undefined, namesById: Map<string, string>) {
  if (conversation.title) return conversation.title
  const others = conversation.participantIds.filter((id) => id !== myId)
  if (others.length === 0) return 'You'
  return others.map((id) => namesById.get(id) ?? '…').join(', ')
}

export function ChatsListPage() {
  const { data: currentUser } = useCurrentUser()
  const { data: conversations, isLoading } = useConversations()
  const activePlans = useActivePlans()

  const allParticipantIds = (conversations ?? []).flatMap((c) => c.participantIds)
  const { byId } = useUsers(allParticipantIds)
  const namesById = new Map([...byId.entries()].map(([id, u]) => [id, u.displayName]))

  return (
    <div className="flex flex-col">
      {activePlans.length > 0 && (
        <section className="pt-4">
          <h2 className="px-4 mb-2 text-sm font-semibold text-gray-500">Active Plans</h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x">
            {activePlans.map((plan) => (
              <ActivePlanCard key={plan.id} plan={plan} currentUserId={currentUser?.id} />
            ))}
          </div>
        </section>
      )}

      {isLoading && <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>}

      {!isLoading && (conversations?.length ?? 0) === 0 && (
        <EmptyState icon={MessageCircle} title="No conversations yet" description="Start a chat with the + button." />
      )}

      {!isLoading && (conversations?.length ?? 0) > 0 && (
        <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-500">Recent Conversations</h2>
      )}

      <ul className="divide-y divide-border">
        {conversations?.map((conversation) => {
          const others = conversation.participantIds
            .filter((id) => id !== currentUser?.id)
            .map((id) => byId.get(id))
            .filter((u): u is NonNullable<typeof u> => !!u)

          return (
            <li key={conversation.id}>
              <Link to={`/chats/${conversation.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-muted">
                {others.length > 1 ? (
                  <AvatarStack users={others.map((u) => ({ id: u.id, name: u.displayName, avatarUrl: u.avatarUrl }))} />
                ) : (
                  <Avatar src={others[0]?.avatarUrl} name={others[0]?.displayName} size="md" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {conversationLabel(conversation, currentUser?.id, namesById)}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {conversation.lastMessage?.content ?? 'No messages yet'}
                  </p>
                </div>
                {conversation.lastMessage && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelativeTime(conversation.lastMessage.createdAt)}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
