import { useClerk } from '@clerk/react'
import { LogOut, Settings } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function ProfilePage() {
  const { data: user } = useCurrentUser()
  const { signOut, openUserProfile } = useClerk()

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <PageHeader title="Profile" />

      <Card className="flex flex-col items-center gap-3 p-6">
        <Avatar src={user?.avatarUrl} name={user?.displayName} size="xl" />
        <p className="text-lg font-semibold text-gray-900">{user?.displayName ?? 'Loading…'}</p>
      </Card>

      <Card className="divide-y divide-border overflow-hidden">
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
