import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { usePlan } from '@/features/plans/hooks'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/api'

export function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <div className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
          isMine ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md bg-surface text-gray-800 shadow-card',
        )}
      >
        {message.content}
      </div>
      {message.planId && <PlanCardPreview planId={message.planId} />}
    </div>
  )
}

function PlanCardPreview({ planId }: { planId: string }) {
  const { data: plan } = usePlan(planId)
  if (!plan) return null

  return (
    <Link to={`/plans/${plan.id}`} className="mt-1.5 w-[80%]">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{plan.title}</p>
          <Tag tone="primary">{plan.displayStatus}</Tag>
        </div>
        {plan.type !== 'goal' && plan.details.location && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{plan.details.location}</p>
        )}
      </Card>
    </Link>
  )
}
