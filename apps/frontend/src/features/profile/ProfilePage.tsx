import { useClerk } from '@clerk/react'
import { Bell, LogOut, Settings } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { usePushNotifications } from '@/features/notifications/usePushNotifications'
import type { PushStatus } from '@/features/notifications/usePushNotifications'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'

const pushHints: Partial<Record<PushStatus, string>> = {
  unsupported: "This browser doesn't support push notifications.",
  'needs-install': 'On iPhone/iPad, add Plan It to your Home Screen first, then open it from there.',
  denied: 'Notifications are blocked. Enable them in your browser or system settings.',
  unavailable: 'Push notifications are not configured on the server.',
}

function PushRow() {
  const { status, busy, enable, disable } = usePushNotifications()
  const on = status === 'on'
  const toggleable = status === 'on' || status === 'off'

  return (
    <div className="px-4 py-3">
      <button
        disabled={!toggleable || busy}
        onClick={() => void (on ? disable() : enable())}
        className="flex w-full items-center gap-3 text-left text-sm font-medium text-gray-700 disabled:opacity-60"
      >
        <Bell className="size-4 text-gray-400" />
        <span className="flex-1">Push notifications</span>
        <span
          role="switch"
          aria-checked={on}
          className={cn('relative h-6 w-10 rounded-full transition-colors', on ? 'bg-primary-500' : 'bg-gray-300')}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
              on ? 'left-[1.125rem]' : 'left-0.5',
            )}
          />
        </span>
      </button>
      {pushHints[status] && <p className="mt-2 pl-7 text-xs text-gray-500">{pushHints[status]}</p>}
    </div>
  )
}

export function ProfilePage() {
  const { data: user } = useCurrentUser()
  const { signOut, openUserProfile } = useClerk()

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <Card className="flex flex-col items-center gap-3 p-6">
        <Avatar src={user?.avatarUrl} name={user?.displayName} size="xl" />
        <p className="text-lg font-semibold text-gray-900">{user?.displayName ?? 'Loading…'}</p>
      </Card>

      <Card className="divide-y divide-border overflow-hidden">
        <PushRow />
        <button
          onClick={() => openUserProfile()}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-surface-muted"
        >
          <Settings className="size-4 text-gray-400" />
          Account settings
        </button>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-surface-muted"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </Card>
    </div>
  )
}
