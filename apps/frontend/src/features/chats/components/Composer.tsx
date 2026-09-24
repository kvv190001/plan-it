import { SOCKET_EVENTS } from '@plan-it/shared'
import { Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { useSocket } from '@/lib/socket'

export function Composer({ conversationId, onSend }: { conversationId: string; onSend: (content: string) => void }) {
  const [value, setValue] = useState('')
  const socket = useSocket()
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleChange(next: string) {
    setValue(next)
    if (!socket) return
    socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId })
    }, 1500)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    socket?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId })
    clearTimeout(typingTimeout.current)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border bg-surface p-3">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
        placeholder="Message…"
        rows={1}
        className="max-h-24 flex-1 resize-none rounded-2xl border border-border bg-surface-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-200"
      />
      <IconButton type="submit" className="bg-primary-600 text-white hover:bg-primary-700" disabled={!value.trim()}>
        <Send className="size-4" />
      </IconButton>
    </form>
  )
}
