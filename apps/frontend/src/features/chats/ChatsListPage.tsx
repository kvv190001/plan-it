import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUsers } from '@/hooks/useUsers'
import { formatRelativeTime } from '@/lib/format'
import type { Conversation } from '@/types/api'
import { useConversations } from './hooks'

function conversationLabel(conversation: Conversation, myId: string | undefined, namesById: Map<string, string>) {
  if (conversation.title) return conversation.title
  const others = conversation.participantIds.filter((id) => id !== myId)
  if (others.length === 0) return 'You'
  return others.map((id) => namesById.get(id) ?? '…').join(', ')
}

export function ChatsListPage() {
  const { data: currentUser } = useCurrentUser()
  const { data: conversations, isLoading } = useConversations()

  const allParticipantIds = (conversations ?? []).flatMap((c) => c.participantIds)
  const { byId } = useUsers(allParticipantIds)
  const namesById = new Map([...byId.entries()].map(([id, u]) => [id, u.displayName]))

  return (
    <div className="flex flex-col">
      <PageHeader title="Chats" />

      {isLoading && <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>}

      {!isLoading && (conversations?.length ?? 0) === 0 && (
        <EmptyState icon={MessageCircle} title="No conversations yet" description="Start a chat with the + button." />
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
