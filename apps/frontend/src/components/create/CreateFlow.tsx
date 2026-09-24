import type { CreatePlanInput } from '@plan-it/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/ui/Sheet'
import { useCreateConversation } from '@/features/chats/hooks'
import { useCreatePlan } from '@/features/plans/hooks'
import { CreateMenu } from './CreateMenu'
import { DateHangoutForm } from './DateHangoutForm'
import { GoalForm } from './GoalForm'
import { NewChatForm } from './NewChatForm'

type Step = 'menu' | 'date' | 'hangout' | 'goal' | 'chat'

const titles: Record<Step, string> = {
  menu: 'Create',
  date: 'Plan a date',
  hangout: 'Plan a hangout',
  goal: 'Set a goal',
  chat: 'New chat',
}

export function CreateFlow({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<Step>('menu')
  const navigate = useNavigate()
  const createPlan = useCreatePlan()
  const createConversation = useCreateConversation()

  function close() {
    onOpenChange(false)
    setTimeout(() => {
      setStep('menu')
      createPlan.reset()
      createConversation.reset()
    }, 200)
  }

  function handleCreatePlan(input: CreatePlanInput) {
    createPlan.mutate(input, {
      onSuccess: (plan) => {
        close()
        navigate(`/plans/${plan.id}`)
      },
    })
  }

  function handleCreateChat(input: { type: 'direct' | 'group'; participantIds: string[]; title?: string }) {
    createConversation.mutate(input, {
      onSuccess: (conversation) => {
        close()
        navigate(`/chats/${conversation.id}`)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())} title={titles[step]}>
      {step === 'menu' && <CreateMenu onSelect={setStep} />}
      {(step === 'date' || step === 'hangout') && (
        <DateHangoutForm
          type={step}
          onSubmit={(input) => handleCreatePlan(input as CreatePlanInput)}
          isPending={createPlan.isPending}
          error={createPlan.error?.message}
        />
      )}
      {step === 'goal' && (
        <GoalForm
          onSubmit={(input) => handleCreatePlan(input as CreatePlanInput)}
          isPending={createPlan.isPending}
          error={createPlan.error?.message}
        />
      )}
      {step === 'chat' && (
        <NewChatForm
          onSubmit={handleCreateChat}
          isPending={createConversation.isPending}
          error={createConversation.error?.message}
        />
      )}
    </Sheet>
  )
}
