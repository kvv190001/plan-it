import { type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-gray-700">{children}</label>
}

const fieldClasses =
  'w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-200'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClasses, className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, 'min-h-20 resize-none', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
