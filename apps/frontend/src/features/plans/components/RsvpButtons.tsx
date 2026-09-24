import { Button } from '@/components/ui/Button'
import { useRsvp } from '../hooks'

export function RsvpButtons({ planId }: { planId: string }) {
  const rsvp = useRsvp(planId)

  return (
    <div className="flex gap-2">
      <Button className="flex-1" onClick={() => rsvp.mutate('accepted')} disabled={rsvp.isPending}>
        Accept
      </Button>
      <Button variant="secondary" className="flex-1" onClick={() => rsvp.mutate('declined')} disabled={rsvp.isPending}>
        Decline
      </Button>
    </div>
  )
}
