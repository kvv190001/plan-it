import { CalendarHeart, MapPin, Target, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Tag } from '@/components/ui/Tag'
import { formatDateTime } from '@/lib/format'
import type { Plan } from '@/types/api'

const typeIcon = { date: CalendarHeart, hangout: Users, goal: Target }

const statusTone: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  proposed: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'danger',
  active: 'primary',
  achieved: 'success',
  abandoned: 'neutral',
}

export function PlanCard({ plan }: { plan: Plan }) {
  const Icon = typeIcon[plan.type]

  return (
    <Link to={`/plans/${plan.id}`}>
      <Card className="flex items-center gap-4 p-5">
        {plan.type === 'goal' ? (
          <ProgressRing
            size={64}
            strokeWidth={6}
            progress={
              plan.details.milestones.length
                ? plan.details.milestones.filter((m) => m.isDone).length / plan.details.milestones.length
                : 0
            }
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Icon className="size-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{plan.title}</p>
          {plan.type !== 'goal' && (
            <p className="truncate text-sm text-gray-500">
              {formatDateTime(plan.details.scheduledAt)}
              {plan.details.location ? ` · ${plan.details.location}` : ''}
            </p>
          )}
          {plan.type === 'goal' && plan.details.description && (
            <p className="truncate text-sm text-gray-500">{plan.details.description}</p>
          )}
        </div>

        <Tag tone={statusTone[plan.displayStatus] ?? 'neutral'} className="shrink-0 text-sm">
          {plan.displayStatus}
        </Tag>
      </Card>
    </Link>
  )
}

export function PlanLocationLine({ location }: { location: string | null }) {
  if (!location) return null
  return (
    <p className="flex items-center gap-1.5 text-sm text-gray-500">
      <MapPin className="size-4" /> {location}
    </p>
  )
}
