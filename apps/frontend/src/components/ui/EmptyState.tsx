import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-500">
        <Icon className="size-7" />
      </span>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  )
}
