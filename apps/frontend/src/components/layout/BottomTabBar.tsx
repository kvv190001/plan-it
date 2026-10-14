import { Activity, MessageCircle, User, CalendarCheck, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NotificationDot } from '@/components/ui/NotificationDot'
import { useNotificationSummary } from '@/features/notifications/hooks'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/chats', label: 'Chats', icon: MessageCircle, key: 'chats' },
  { to: '/friends', label: 'Friends', icon: Users, key: 'friends' },
  { to: '/plans', label: 'Plans', icon: CalendarCheck, key: 'plans' },
  { to: '/activity', label: 'Activity', icon: Activity, key: 'activity' },
  { to: '/profile', label: 'Profile', icon: User, key: null },
] as const

export function BottomTabBar() {
  const { data: summary } = useNotificationSummary()
  return (
    <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      {tabs.map(({ to, label, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 px-2 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
                {key && (summary?.[key] ?? 0) > 0 && (
                  <NotificationDot className="absolute -right-1 -top-0.5 ring-2 ring-surface" />
                )}
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
