import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FloatingActionButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto max-w-[480px]">
      <button
        onClick={onClick}
        aria-label="Create"
        className={cn(
          'pointer-events-auto absolute right-4 bottom-0 flex size-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-fab transition-transform hover:scale-105 active:scale-95',
          className,
        )}
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>
    </div>
  )
}
