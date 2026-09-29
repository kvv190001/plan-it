import { CalendarHeart } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDayHeading } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DatePlan, GoalPlan, HangoutPlan, Plan } from '@/types/api'
import { PlanCard } from './components/PlanCard'
import { usePlans } from './hooks'

type FilterKey = 'today' | 'upcoming' | 'past' | 'goals' | 'dates' | 'hangouts' | 'cancelled'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'goals', label: 'Goals' },
  { key: 'dates', label: 'Dates' },
  { key: 'hangouts', label: 'Hangouts' },
  { key: 'cancelled', label: 'Cancelled' },
]

const EMPTY_COPY: Record<FilterKey, string> = {
  today: 'Nothing scheduled or due today.',
  upcoming: 'No upcoming dates, hangouts, or goals.',
  past: 'No past dates, hangouts, or goals.',
  goals: 'No goals yet.',
  dates: 'No dates planned yet.',
  hangouts: 'No hangouts planned yet.',
  cancelled: 'Nothing cancelled or abandoned.',
}

// A plan that's cancelled (date/hangout) or abandoned (goal) — the two
// "this didn't happen" terminal states, one per status vocabulary (see
// docs/05-plan-lifecycles.md on why goals use a different vocabulary).
function isCancelledOrAbandoned(plan: Plan) {
  return plan.displayStatus === 'cancelled' || plan.displayStatus === 'abandoned'
}

function isSameDay(iso: string, reference: Date) {
  return new Date(iso).toDateString() === reference.toDateString()
}

// A goal's spot on the timeline is its target date; an event's is when it's
// scheduled. Goals without a target date have nowhere on the timeline to
// go — they still show up in the Goals tab, just not Today/Upcoming/Past.
function timelineDate(plan: Plan): string | null {
  return plan.type === 'goal' ? plan.endDate : plan.details.scheduledAt
}

function sortableTime(plan: Plan) {
  const iso = timelineDate(plan)
  return iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY
}

function groupByDay(items: Plan[], order: 'asc' | 'desc' = 'asc') {
  const sorted = [...items].sort((a, b) => (order === 'asc' ? sortableTime(a) - sortableTime(b) : sortableTime(b) - sortableTime(a)))
  const groups = new Map<string, Plan[]>()
  for (const plan of sorted) {
    const iso = timelineDate(plan)
    if (!iso) continue
    const key = formatDayHeading(iso)
    groups.set(key, [...(groups.get(key) ?? []), plan])
  }
  return groups
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-primary-600 text-white' : 'bg-surface text-gray-500 border border-border',
      )}
    >
      {children}
    </button>
  )
}

export function PlansListPage() {
  const { data: plans, isLoading } = usePlans()
  // `null` means "no explicit choice yet" — once the user picks a chip we
  // stick with it, but until then we land on whichever of Today/Upcoming
  // actually has something to show.
  const [selectedFilter, setSelectedFilter] = useState<FilterKey | null>(null)
  const today = new Date()

  const events = (plans ?? []).filter((p): p is DatePlan | HangoutPlan => p.type !== 'goal')
  const goals = (plans ?? [])
    .filter((p): p is GoalPlan => p.type === 'goal')
    .sort((a, b) => sortableTime(a) - sortableTime(b))

  // Today/Upcoming/Past are the "what's actually still on" timeline — a
  // cancelled hangout or an abandoned goal isn't upcoming or past-due,
  // it's just gone, so those live in their own Cancelled tab instead.
  const liveEvents = events.filter((p) => !isCancelledOrAbandoned(p))
  const liveGoals = goals.filter((g) => g.displayStatus !== 'abandoned' && g.endDate)
  const isFuture = (plan: Plan) => sortableTime(plan) > today.getTime() && !isSameDay(timelineDate(plan)!, today)
  const isPast = (plan: Plan) => sortableTime(plan) < today.getTime() && !isSameDay(timelineDate(plan)!, today)

  // "Today" mixes both event types and any active goal whose target date
  // lands today — a goal doesn't recur daily, but a due-today goal is
  // exactly the kind of thing this tab exists to surface.
  const todayItems: Plan[] = [
    ...liveEvents.filter((p) => isSameDay(p.details.scheduledAt, today)),
    ...liveGoals.filter((g) => g.displayStatus === 'active' && isSameDay(g.endDate!, today)),
  ].sort((a, b) => sortableTime(a) - sortableTime(b))

  const filter = selectedFilter ?? (todayItems.length > 0 ? 'today' : 'upcoming')

  // A goal is "upcoming" while it's still active and its target date hasn't
  // arrived; once achieved, it's done and belongs in Past regardless of
  // when its target date was.
  const upcomingGroups = groupByDay([
    ...liveEvents.filter(isFuture),
    ...liveGoals.filter((g) => g.displayStatus === 'active' && isFuture(g)),
  ])
  const pastGroups = groupByDay(
    [
      ...liveEvents.filter(isPast),
      ...liveGoals.filter((g) => g.displayStatus === 'achieved' || (g.displayStatus === 'active' && isPast(g))),
    ],
    'desc',
  )

  // Dates/Hangouts/Goals are plain type filters, not status filters, so
  // (unlike Today/Upcoming/Past) they still include cancelled/abandoned
  // items of that type — Cancelled below is the place to see those without
  // digging through every type tab.
  const dateGroups = groupByDay(events.filter((p) => p.type === 'date'))
  const hangoutGroups = groupByDay(events.filter((p) => p.type === 'hangout'))

  const cancelledItems: Plan[] = [...events, ...goals]
    .filter(isCancelledOrAbandoned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const isEmpty =
    filter === 'today'
      ? todayItems.length === 0
      : filter === 'goals'
        ? goals.length === 0
        : filter === 'upcoming'
          ? upcomingGroups.size === 0
          : filter === 'past'
            ? pastGroups.size === 0
            : filter === 'dates'
              ? dateGroups.size === 0
              : filter === 'hangouts'
                ? hangoutGroups.size === 0
                : cancelledItems.length === 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 overflow-x-auto px-4 pt-4 no-scrollbar">
        {FILTERS.map(({ key, label }) => (
          <FilterChip key={key} active={filter === key} onClick={() => setSelectedFilter(key)}>
            {label}
          </FilterChip>
        ))}
      </div>

      {isLoading && <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>}

      {!isLoading && (plans?.length ?? 0) === 0 && (
        <EmptyState icon={CalendarHeart} title="No plans yet" description="Tap + to plan a date, hangout, or goal." />
      )}

      {!isLoading && (plans?.length ?? 0) > 0 && isEmpty && (
        <EmptyState icon={CalendarHeart} title="Nothing here" description={EMPTY_COPY[filter]} />
      )}

      {filter === 'today' && todayItems.length > 0 && (
        <section className="flex flex-col gap-4 px-4">
          {todayItems.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      )}

      {filter === 'goals' && goals.length > 0 && (
        <section className="flex flex-col gap-4 px-4">
          {goals.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      )}

      {filter === 'cancelled' && cancelledItems.length > 0 && (
        <section className="flex flex-col gap-4 px-4">
          {cancelledItems.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      )}

      {filter === 'upcoming' &&
        [...upcomingGroups.entries()].map(([heading, plansForDay]) => (
          <section key={heading} className="px-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">{heading}</h2>
            <div className="flex flex-col gap-4">
              {plansForDay.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        ))}

      {filter === 'past' &&
        [...pastGroups.entries()].map(([heading, plansForDay]) => (
          <section key={heading} className="px-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">{heading}</h2>
            <div className="flex flex-col gap-4">
              {plansForDay.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        ))}

      {filter === 'dates' &&
        [...dateGroups.entries()].map(([heading, plansForDay]) => (
          <section key={heading} className="px-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">{heading}</h2>
            <div className="flex flex-col gap-4">
              {plansForDay.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        ))}

      {filter === 'hangouts' &&
        [...hangoutGroups.entries()].map(([heading, plansForDay]) => (
          <section key={heading} className="px-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">{heading}</h2>
            <div className="flex flex-col gap-4">
              {plansForDay.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}
