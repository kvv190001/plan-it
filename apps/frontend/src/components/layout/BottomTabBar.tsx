import { Activity, MessageCircle, User, CalendarCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/chats', label: 'Chats', icon: MessageCircle },
  { to: '/plans', label: 'Plans', icon: CalendarCheck },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomTabBar() {
  return (
    <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      {tabs.map(({ to, label, icon: Icon }) => (
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
              <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
