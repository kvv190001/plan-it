import { CalendarHeart, Target, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useUsers } from '@/hooks/useUsers'
import { formatEventCardTime, formatGoalTargetDate } from '@/lib/format'
import { usePlan } from '@/features/plans/hooks'
import type { DatePlan, GoalPlan, HangoutPlan, Plan } from '@/types/api'

const typeIcon = { date: CalendarHeart, hangout: Users, goal: Target }

function participantsLabel(names: string[]) {
  if (names.length === 0) return null
  if (names.length === 1) return `${names[0]} & You`
  return `${names[0]} +${names.length}`
}

function EventSubtitle({ plan, currentUserId }: { plan: DatePlan | HangoutPlan; currentUserId?: string }) {
  const { data: detail } = usePlan(plan.id)
  const otherIds = (detail?.participants ?? [])
    .map((p) => p.userId)
    .filter((id) => id !== currentUserId)
  const { byId } = useUsers(otherIds)
  const names = otherIds.map((id) => byId.get(id)?.displayName).filter((n): n is string => !!n)
  return <p className="truncate text-xs text-gray-500">{participantsLabel(names) ?? '\u00A0'}</p>
}

function GoalSubtitle({ plan }: { plan: GoalPlan }) {
  const total = plan.details.milestones.length
  const done = plan.details.milestones.filter((m) => m.isDone).length
  return (
    <p className="truncate text-xs text-gray-500">{total > 0 ? `${done}/${total} milestones` : 'No milestones yet'}</p>
  )
}

export function ActivePlanCard({ plan, currentUserId }: { plan: Plan; currentUserId?: string }) {
  const Icon = typeIcon[plan.type]

  return (
    <Link to={`/plans/${plan.id}`} className="shrink-0 snap-start">
      <Card className="flex w-40 flex-col gap-1.5 p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Icon className="size-4" />
        </span>
        <p className="truncate text-sm font-semibold text-gray-900">{plan.title}</p>
        {plan.type === 'goal' ? <GoalSubtitle plan={plan} /> : <EventSubtitle plan={plan} currentUserId={currentUserId} />}
        {plan.type !== 'goal' && (
          <p className="truncate text-xs font-medium text-primary-600">{formatEventCardTime(plan.details.scheduledAt)}</p>
        )}
        {plan.type === 'goal' && plan.endDate && (
          <p className="truncate text-xs font-medium text-primary-600">{formatGoalTargetDate(plan.endDate)}</p>
        )}
      </Card>
    </Link>
  )
}
