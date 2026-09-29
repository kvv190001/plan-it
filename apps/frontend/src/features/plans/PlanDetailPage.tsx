import { ChevronDown, Flag, Heart, MapPin, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Tag } from '@/components/ui/Tag'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDateLabel, formatDateTime, formatLastProgress, formatTimeLeft } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GoalPlan } from '@/types/api'
import { CommentFeed } from './components/CommentFeed'
import { MilestoneList } from './components/MilestoneList'
import { ParticipantList } from './components/ParticipantList'
import { RsvpButtons } from './components/RsvpButtons'
import { useCancelPlan, usePlan, useUpdatePlan } from './hooks'

const statusTone: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  proposed: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'danger',
  active: 'primary',
  achieved: 'success',
  abandoned: 'neutral',
}

// Bigger, coloured section titles (one accent colour per section) so the
// page reads as distinct blocks rather than one continuous list.
function SectionHeader({ icon: Icon, className, children }: { icon: LucideIcon; className: string; children: ReactNode }) {
  return (
    <h2 className={cn('mb-3 flex items-center gap-2 text-base font-bold', className)}>
      <Icon className="size-5" />
      {children}
    </h2>
  )
}

// Same header styling as SectionHeader, but as a toggle button that
// collapses its section — used for the lower-priority sections (support
// crew, comments) so the page opens compact and the reader expands only
// what they care about.
function CollapsibleSection({
  icon: Icon,
  className,
  title,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon
  className: string
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('mb-3 flex w-full items-center gap-2 text-base font-bold', className)}
      >
        <Icon className="size-5" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('size-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && children}
    </section>
  )
}

function GoalSummary({ plan }: { plan: GoalPlan }) {
  const milestones = plan.details.milestones
  const progress = milestones.length ? milestones.filter((m) => m.isDone).length / milestones.length : 0
  const timeLeft = formatTimeLeft(plan.endDate)

  return (
    <>
      {(plan.details.description || plan.endDate) && (
        <p className="text-sm text-gray-500">
          {plan.details.description}
          {plan.details.description && plan.endDate ? ' · ' : ''}
          {plan.endDate && formatDateLabel(plan.endDate)}
        </p>
      )}
      <Card className="flex flex-col items-center gap-5 p-6">
        <ProgressRing size={160} strokeWidth={12} progress={progress} caption="Complete" />
        <div className="flex w-full divide-x divide-border">
          {timeLeft && (
            <div className="flex flex-1 flex-col items-center gap-1">
              <p className="text-xs text-gray-500">{timeLeft.unit}</p>
              <p className="text-lg font-semibold text-gray-900">{timeLeft.value}</p>
            </div>
          )}
          <div className="flex flex-1 flex-col items-center gap-1">
            <p className="text-xs text-gray-500">Last Progress</p>
            <p className="text-lg font-semibold text-gray-900">{formatLastProgress(milestones)}</p>
          </div>
        </div>
      </Card>
    </>
  )
}

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const { data: plan, isLoading } = usePlan(planId)
  const { data: currentUser } = useCurrentUser()
  const cancelPlan = useCancelPlan(planId!)
  const updatePlan = useUpdatePlan(planId!)

  if (isLoading || !plan) {
    return <p className="p-6 text-sm text-gray-400">Loading…</p>
  }

  const isOwner = plan.createdBy === currentUser?.id
  const myMembership = plan.participants.find((p) => p.userId === currentUser?.id)
  const isPendingInvitee = myMembership && myMembership.role !== 'owner' && myMembership.rsvpStatus === 'pending'
  const canCancel = isOwner && plan.type !== 'goal' && plan.status !== 'cancelled'
  const goalStatus = plan.type === 'goal' ? plan.details.status : null
  // "Support crew" is the goal's invited helpers, not the owner running the
  // goal — the owner already has their own affordances (add/edit milestones,
  // cancel, etc.), so listing them again here would just be noise.
  const listedParticipants = plan.type === 'goal' ? plan.participants.filter((p) => p.role !== 'owner') : plan.participants

  return (
    <div className="flex flex-col gap-8 px-4 py-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackTo="/plans" />
        <h1 className="flex-1 truncate text-lg font-semibold text-gray-900">{plan.title}</h1>
        <Tag tone={statusTone[plan.displayStatus] ?? 'neutral'}>{plan.displayStatus}</Tag>
      </div>

      {plan.type === 'goal' ? (
        <GoalSummary plan={plan} />
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
          <SectionHeader icon={Flag} className="text-primary-600">
            Milestones
          </SectionHeader>
          <MilestoneList planId={plan.id} milestones={plan.details.milestones} canEdit={isOwner} />
        </section>
      )}

      <CollapsibleSection icon={Heart} className="text-rose-500" title={plan.type === 'goal' ? 'Support Crew' : 'Participants'}>
        <ParticipantList participants={listedParticipants} />
      </CollapsibleSection>

      {plan.type === 'goal' && !isPendingInvitee && (
        <CollapsibleSection icon={MessageSquare} className="text-sky-600" title="Comments">
          <CommentFeed planId={plan.id} />
        </CollapsibleSection>
      )}

      {isOwner && plan.type === 'goal' && goalStatus === 'active' && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => updatePlan.mutate({ status: 'achieved' })} disabled={updatePlan.isPending}>
            Mark Achieved
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => updatePlan.mutate({ status: 'abandoned' })}
            disabled={updatePlan.isPending}
          >
            Abandon Goal
          </Button>
        </div>
      )}

      {isOwner && plan.type === 'goal' && goalStatus !== 'active' && (
        <Button variant="secondary" onClick={() => updatePlan.mutate({ status: 'active' })} disabled={updatePlan.isPending}>
          {goalStatus === 'achieved' ? 'Reopen Goal' : 'Reactivate Goal'}
        </Button>
      )}

      {canCancel && (
        <Button variant="danger" onClick={() => cancelPlan.mutate()} disabled={cancelPlan.isPending}>
          Cancel plan
        </Button>
      )}
    </div>
  )
}
