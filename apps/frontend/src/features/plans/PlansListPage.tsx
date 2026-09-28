import { CalendarHeart } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDayHeading } from '@/lib/format'
import type { DatePlan, HangoutPlan } from '@/types/api'
import { PlanCard } from './components/PlanCard'
import { usePlans } from './hooks'

export function PlansListPage() {
  const { data: plans, isLoading } = usePlans()

  const goals = (plans ?? []).filter((p) => p.type === 'goal')
  const events = (plans ?? [])
    .filter((p): p is DatePlan | HangoutPlan => p.type !== 'goal')
    .sort((a, b) => new Date(a.details.scheduledAt).getTime() - new Date(b.details.scheduledAt).getTime())

  const groups = new Map<string, (DatePlan | HangoutPlan)[]>()
  for (const plan of events) {
    const key = formatDayHeading(plan.details.scheduledAt)
    groups.set(key, [...(groups.get(key) ?? []), plan])
  }

  return (
    <div className="flex flex-col gap-6">
      {isLoading && <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>}

      {!isLoading && (plans?.length ?? 0) === 0 && (
        <EmptyState icon={CalendarHeart} title="No plans yet" description="Tap + to plan a date, hangout, or goal." />
      )}

      {goals.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Goals</h2>
          <div className="space-y-2">
            {goals.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {[...groups.entries()].map(([heading, plansForDay]) => (
        <section key={heading} className="px-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">{heading}</h2>
          <div className="space-y-2">
            {plansForDay.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
