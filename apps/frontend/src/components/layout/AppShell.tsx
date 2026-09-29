import { useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { CreateFlow } from '@/components/create/CreateFlow'
import { AppHeader } from './AppHeader'
import { BottomTabBar } from './BottomTabBar'
import { FloatingActionButton } from './FloatingActionButton'

// FAB and the branded header are shown on the top-level tab list screens,
// not on detail screens (conversation thread, plan detail) which have their
// own headers (back button, title, actions).
export function AppShell() {
  const [createOpen, setCreateOpen] = useState(false)
  const isTopLevel = useMatch('/:tab')

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {isTopLevel && <AppHeader />}
      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        <Outlet />
      </div>
      {isTopLevel && <FloatingActionButton onClick={() => setCreateOpen(true)} />}
      <BottomTabBar />
      <CreateFlow open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
