import { Check, Copy, MessageCircle, RefreshCw, Share2, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { useCreateConversation } from '@/features/chats/hooks'
import type { PublicUser } from '@/types/api'
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useFriendRequests,
  useFriends,
  useMyFriendCode,
  useRegenerateFriendCode,
  useRemoveFriend,
  useSendFriendRequest,
} from './hooks'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-4 pt-5 pb-2 text-sm font-semibold text-gray-500">{children}</h2>
}

function MyCodeCard() {
  const { data } = useMyFriendCode()
  const regenerate = useRegenerateFriendCode()
  const [copied, setCopied] = useState(false)
  const code = data?.friendCode

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function share() {
    if (!code) return
    const url = `${window.location.origin}/friends?code=${code}`
    if (navigator.share) await navigator.share({ title: 'Add me on Plan it', text: `My Plan it friend code: ${code}`, url }).catch(() => {})
    else await copy()
  }

  function handleRegenerate() {
    if (window.confirm('Generate a new code? Your old code will stop working.')) regenerate.mutate()
  }

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-gray-500">Your friend code</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-primary-700">{code ?? '········'}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={copy} disabled={!code}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button size="sm" variant="secondary" onClick={share} disabled={!code}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={regenerate.isPending}>
          <RefreshCw className="size-4" />
          New code
        </Button>
      </div>
    </section>
  )
}

function AddFriendForm() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const send = useSendFriendRequest()
  const [notice, setNotice] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setNotice(null)
    send.mutate(code.trim(), {
      onSuccess: (result) => {
        setCode('')
        setNotice(result.status === 'accepted' ? "You're now friends!" : 'Friend request sent')
        if (searchParams.has('code')) setSearchParams({}, { replace: true })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mt-4">
      <p className="mb-2 text-sm font-semibold text-gray-500">Add a friend</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter friend code"
          maxLength={32}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2.5 font-mono text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary-200"
        />
        <Button type="submit" disabled={send.isPending || !code.trim()}>
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {send.error && <p className="mt-2 text-sm text-red-600">{send.error.message}</p>}
      {notice && !send.error && <p className="mt-2 text-sm text-green-600">{notice}</p>}
    </form>
  )
}

function UserRow({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{user.displayName}</p>
      {children}
    </li>
  )
}

function RequestsSection() {
  const { data } = useFriendRequests()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const incoming = data?.incoming ?? []
  const outgoing = data?.outgoing ?? []
  if (incoming.length === 0 && outgoing.length === 0) return null

  return (
    <>
      {incoming.length > 0 && (
        <section>
          <SectionTitle>Requests ({incoming.length})</SectionTitle>
          <ul className="divide-y divide-border">
            {incoming.map((req) => (
              <UserRow key={req.id} user={req.user}>
                <Button size="sm" onClick={() => accept.mutate(req.id)} disabled={accept.isPending}>
                  Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={() => decline.mutate(req.id)} disabled={decline.isPending}>
                  Decline
                </Button>
              </UserRow>
            ))}
          </ul>
        </section>
      )}
      {outgoing.length > 0 && (
        <section>
          <SectionTitle>Sent</SectionTitle>
          <ul className="divide-y divide-border">
            {outgoing.map((req) => (
              <UserRow key={req.id} user={req.user}>
                <span className="text-xs text-gray-400">Pending</span>
                <Button size="sm" variant="ghost" onClick={() => decline.mutate(req.id)} disabled={decline.isPending}>
                  Cancel
                </Button>
              </UserRow>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function FriendsList() {
  const { data: friends, isLoading } = useFriends()
  const remove = useRemoveFriend()
  const createConversation = useCreateConversation()
  const navigate = useNavigate()

  function message(friend: PublicUser) {
    createConversation.mutate(
      { type: 'direct', participantIds: [friend.id] },
      { onSuccess: (conversation) => navigate(`/chats/${conversation.id}`) },
    )
  }

  function handleRemove(friend: PublicUser) {
    if (window.confirm(`Remove ${friend.displayName} from your friends?`)) remove.mutate(friend.id)
  }

  return (
    <section>
      <SectionTitle>Friends{friends && friends.length > 0 ? ` (${friends.length})` : ''}</SectionTitle>
      {isLoading && <p className="px-4 py-2 text-sm text-gray-400">Loading…</p>}
      {!isLoading && (friends?.length ?? 0) === 0 && (
        <EmptyState icon={Users} title="No friends yet" description="Share your code or enter a friend's code to get started." />
      )}
      <ul className="divide-y divide-border">
        {friends?.map((friend) => (
          <UserRow key={friend.id} user={friend}>
            <IconButton aria-label={`Message ${friend.displayName}`} onClick={() => message(friend)} disabled={createConversation.isPending}>
              <MessageCircle className="size-5" />
            </IconButton>
            <IconButton aria-label={`Remove ${friend.displayName}`} onClick={() => handleRemove(friend)}>
              <UserMinus className="size-5" />
            </IconButton>
          </UserRow>
        ))}
      </ul>
    </section>
  )
}

export function FriendsPage() {
  return (
    <div className="flex flex-col pb-4">
      <MyCodeCard />
      <AddFriendForm />
      <RequestsSection />
      <FriendsList />
    </div>
  )
}
