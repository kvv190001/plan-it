import { SOCKET_EVENTS } from '@plan-it/shared'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUsers } from '@/hooks/useUsers'
import { useSocketEvent } from '@/lib/socket'
import { useConversations, useMessages, useSendMessage } from './hooks'
import { Composer } from './components/Composer'
import { MessageBubble } from './components/MessageBubble'

// Messages more than this many minutes apart get a new timestamp shown above them.
const MESSAGE_GROUP_GAP_MS = 30 * 60 * 1000

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { data: currentUser } = useCurrentUser()
  const { data: conversations } = useConversations()
  const { data: messages, isLoading } = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId!)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  const conversation = conversations?.find((c) => c.id === conversationId)
  const others = (conversation?.participantIds ?? []).filter((id) => id !== currentUser?.id)
  const { byId } = useUsers(others)
  const otherUsers = others.map((id) => byId.get(id)).filter((u): u is NonNullable<typeof u> => !!u)
  const title = conversation?.title ?? (otherUsers.map((u) => u.displayName).join(', ') || 'Chat')

  useSocketEvent<{ conversationId: string; userId: string; isTyping: boolean }>(
    SOCKET_EVENTS.TYPING_UPDATE,
    (payload) => {
      if (payload.conversationId !== conversationId) return
      setTypingUsers((prev) => {
        const next = new Set(prev)
        if (payload.isTyping) next.add(payload.userId)
        else next.delete(payload.userId)
        return next
      })
    },
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length])

  const typingNames = [...typingUsers].map((id) => byId.get(id)?.displayName).filter(Boolean)

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface-muted/95 px-2 py-3 backdrop-blur">
        <Link
          to="/chats"
          className="inline-flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronLeft className="size-5" />
        </Link>
        {otherUsers.length > 1 ? (
          <AvatarStack users={otherUsers.map((u) => ({ id: u.id, name: u.displayName, avatarUrl: u.avatarUrl }))} max={3} />
        ) : (
          <Avatar src={otherUsers[0]?.avatarUrl} name={otherUsers[0]?.displayName} size="sm" />
        )}
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {messages?.map((message, index) => {
          const previous = messages[index - 1]
          const dayChanged =
            !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString()
          const showTimestamp =
            dayChanged ||
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > MESSAGE_GROUP_GAP_MS
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.senderId === currentUser?.id}
              showTimestamp={showTimestamp}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {typingNames.length > 0 && (
        <p className="px-4 pb-1 text-xs text-gray-400">{typingNames.join(', ')} typing…</p>
      )}

      <Composer conversationId={conversationId!} onSend={(content) => sendMessage.mutate({ content })} />
    </div>
  )
}
