import { ChevronLeft, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Tag } from '@/components/ui/Tag'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDateTime } from '@/lib/format'
import { CommentFeed } from './components/CommentFeed'
import { MilestoneList } from './components/MilestoneList'
import { ParticipantList } from './components/ParticipantList'
import { RsvpButtons } from './components/RsvpButtons'
import { useCancelPlan, usePlan } from './hooks'

const statusTone: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  proposed: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'danger',
  active: 'primary',
  achieved: 'success',
  abandoned: 'neutral',
}

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const { data: plan, isLoading } = usePlan(planId)
  const { data: currentUser } = useCurrentUser()
  const cancelPlan = useCancelPlan(planId!)

  if (isLoading || !plan) {
    return <p className="p-6 text-sm text-gray-400">Loading…</p>
  }

  const isOwner = plan.createdBy === currentUser?.id
  const myMembership = plan.participants.find((p) => p.userId === currentUser?.id)
  const isPendingInvitee = myMembership && myMembership.role !== 'owner' && myMembership.rsvpStatus === 'pending'
  const canCancel = isOwner && plan.type !== 'goal' && plan.status !== 'cancelled'

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="flex items-center gap-2">
        <Link to="/plans" className="inline-flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="flex-1 truncate text-lg font-semibold text-gray-900">{plan.title}</h1>
        <Tag tone={statusTone[plan.displayStatus] ?? 'neutral'}>{plan.displayStatus}</Tag>
      </div>

      {plan.type === 'goal' ? (
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing
            progress={
              plan.details.milestones.length
                ? plan.details.milestones.filter((m) => m.isDone).length / plan.details.milestones.length
                : 0
            }
          />
          <div>
            {plan.details.description && <p className="text-sm text-gray-600">{plan.details.description}</p>}
            {plan.endDate && <p className="mt-1 text-xs text-gray-400">Target: {formatDateTime(plan.endDate)}</p>}
          </div>
        </Card>
      ) : (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium text-gray-800">{formatDateTime(plan.details.scheduledAt)}</p>
          {plan.details.location && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="size-4" /> {plan.details.location}
            </p>
          )}
          {plan.details.notes && <p className="text-sm text-gray-500">{plan.details.notes}</p>}
        </Card>
      )}

      {isPendingInvitee && <RsvpButtons planId={plan.id} />}

      {plan.type === 'goal' && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Milestones</h2>
          <MilestoneList planId={plan.id} milestones={plan.details.milestones} canEdit={isOwner} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">
          {plan.type === 'goal' ? 'Support crew' : 'Participants'}
        </h2>
        <ParticipantList participants={plan.participants} />
      </section>

      {plan.type === 'goal' && !isPendingInvitee && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Comments</h2>
          <CommentFeed planId={plan.id} />
        </section>
      )}

      {canCancel && (
        <Button variant="danger" onClick={() => cancelPlan.mutate()} disabled={cancelPlan.isPending}>
          Cancel plan
        </Button>
      )}
    </div>
  )
}
