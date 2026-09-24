import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
}

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex select-none items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700 font-medium ring-2 ring-white',
        sizeClasses[size],
        className,
      )}
    >
      <RadixAvatar.Image src={src ?? undefined} alt={name ?? 'avatar'} className="h-full w-full object-cover" />
      <RadixAvatar.Fallback delayMs={200}>{initials(name)}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}

export function AvatarStack({ users, max = 4 }: { users: { id: string; name?: string | null; avatarUrl?: string | null }[]; max?: number }) {
  const shown = users.slice(0, max)
  const overflow = users.length - shown.length
  return (
    <div className="flex -space-x-3">
      {shown.map((u) => (
        <Avatar key={u.id} src={u.avatarUrl} name={u.name} size="sm" />
      ))}
      {overflow > 0 && (
        <div className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  )
}
