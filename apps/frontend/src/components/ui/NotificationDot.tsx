import { cn } from '@/lib/utils'

export function NotificationDot({ className }: { className?: string }) {
  return <span aria-label="New" className={cn('block size-2.5 rounded-full bg-red-500', className)} />
}
