import type { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-muted/95 px-4 py-4 backdrop-blur">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {action}
    </div>
  )
}
