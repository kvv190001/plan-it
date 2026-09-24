import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { SignInPage } from '@/features/auth/SignInPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { ChatsListPage } from '@/features/chats/ChatsListPage'
import { ConversationPage } from '@/features/chats/ConversationPage'
import { PlanDetailPage } from '@/features/plans/PlanDetailPage'
import { PlansListPage } from '@/features/plans/PlansListPage'
import { ProfilePage } from '@/features/profile/ProfilePage'

export const router = createBrowserRouter([
  { path: '/sign-in/*', element: <SignInPage /> },
  { path: '/sign-up/*', element: <SignUpPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/chats" replace /> },
      { path: 'chats', element: <ChatsListPage /> },
      { path: 'chats/:conversationId', element: <ConversationPage /> },
      { path: 'plans', element: <PlansListPage /> },
      { path: 'plans/:planId', element: <PlanDetailPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/chats" replace /> },
    ],
  },
])
