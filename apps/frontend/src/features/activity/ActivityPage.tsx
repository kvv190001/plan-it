import { Activity as ActivityIcon, CalendarHeart, CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRelativeTime } from '@/lib/format'
import type { ActivityEvent } from '@/types/api'
import { useActivity } from './hooks'

const icons: Record<string, LucideIcon> = {
  plan_created: CalendarHeart,
  plan_confirmed: CheckCircle2,
  plan_cancelled: XCircle,
  milestone_completed: CheckCircle2,
  goal_achieved: CheckCircle2,
  comment_posted: MessageSquare,
}

function describe(event: ActivityEvent): string {
  const actor = event.actorDisplayName ?? 'Someone'
  const payload = event.payload ?? {}
  switch (event.type) {
    case 'plan_created':
      return `${actor} created "${payload.title ?? 'a plan'}"`
    case 'plan_confirmed':
      return `"${payload.title ?? 'A plan'}" was confirmed`
    case 'plan_cancelled':
      return `"${payload.title ?? 'A plan'}" was cancelled`
    case 'milestone_completed':
      return `${actor} completed a milestone`
    case 'goal_achieved':
      return `"${payload.planTitle ?? 'A goal'}" was achieved`
    case 'comment_posted':
      return `${actor} commented on "${payload.planTitle ?? 'a goal'}"`
    default:
      return `${actor} did something`
  }
}

export function ActivityPage() {
  const { data: events, isLoading } = useActivity()

  return (
    <div className="flex flex-col">
      {isLoading && <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>}

      {!isLoading && (events?.length ?? 0) === 0 && (
        <EmptyState icon={ActivityIcon} title="No activity yet" description="Updates from your plans will show up here." />
      )}

      <ul className="divide-y divide-border">
        {events?.map((event) => {
          const Icon = icons[event.type] ?? ActivityIcon
          const content = (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar src={event.actorAvatarUrl} name={event.actorDisplayName} size="sm" />
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <Icon className="size-3.5" />
              </span>
              <p className="flex-1 text-sm text-gray-700">{describe(event)}</p>
              <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(event.createdAt)}</span>
            </div>
          )
          return <li key={event.id}>{event.planId ? <Link to={`/plans/${event.planId}`}>{content}</Link> : content}</li>
        })}
      </ul>
    </div>
  )
}
