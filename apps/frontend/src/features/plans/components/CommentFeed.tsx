import { Send } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useUsers } from '@/hooks/useUsers'
import { formatRelativeTime } from '@/lib/format'
import { useAddComment, useComments } from '../hooks'

export function CommentFeed({ planId }: { planId: string }) {
  const { data: comments } = useComments(planId)
  const addComment = useAddComment(planId)
  const [value, setValue] = useState('')
  const { byId } = useUsers((comments ?? []).map((c) => c.authorId))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    addComment.mutate(value.trim(), { onSuccess: () => setValue('') })
  }

  return (
    <div className="space-y-3">
      {comments?.map((comment) => {
        const author = byId.get(comment.authorId)
        return (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar src={author?.avatarUrl} name={author?.displayName} size="xs" />
            <div className="flex-1 rounded-xl bg-surface-muted p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800">{author?.displayName ?? '…'}</span>
                <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700">{comment.content}</p>
            </div>
          </div>
        )
      })}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cheer them on…"
          className="flex-1 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-200"
        />
        <button
          type="submit"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-50"
          disabled={!value.trim() || addComment.isPending}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
