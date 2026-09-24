import { CalendarHeart, MessageCircle, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const options: { key: 'date' | 'hangout' | 'goal' | 'chat'; label: string; description: string; icon: LucideIcon }[] = [
  { key: 'date', label: 'Plan a date', description: 'Just the two of you', icon: CalendarHeart },
  { key: 'hangout', label: 'Plan a hangout', description: 'Invite a group', icon: Users },
  { key: 'goal', label: 'Set a goal', description: 'Track milestones with a support crew', icon: Target },
  { key: 'chat', label: 'New chat', description: 'Message someone directly', icon: MessageCircle },
]

export function CreateMenu({ onSelect }: { onSelect: (key: 'date' | 'hangout' | 'goal' | 'chat') => void }) {
  return (
    <div className="space-y-2">
      {options.map(({ key, label, description, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-muted"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Icon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">{label}</span>
            <span className="block text-xs text-gray-500">{description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
