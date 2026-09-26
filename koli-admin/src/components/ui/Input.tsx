import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

const field = (error?: string) => cn(
  'w-full bg-card border rounded-input px-3 text-body text-ink placeholder:text-muted transition-colors',
  'focus:border-primary focus:ring-2 focus:ring-primary/15',
  error ? 'border-down' : 'border-line',
)

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="text-secondary font-medium text-ink-2">{children}</label>
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <p id={id} role="alert" className="text-caption text-down">{error}</p> : null
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: ReactNode }

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const auto = useId(); const fid = id ?? auto
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={fid}>{label}</Label>}
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{icon}</span>}
          <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : undefined}
            {...props} className={cn(field(error), 'h-10', icon ? 'pl-9' : undefined, className)} />
        </div>
        <FieldError id={`${fid}-err`} error={error} />
      </div>
    )
  },
)
Input.displayName = 'Input'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const auto = useId(); const fid = id ?? auto
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={fid}>{label}</Label>}
        <textarea ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : undefined}
          {...props} className={cn(field(error), 'py-2.5 resize-none', className)} />
        <FieldError id={`${fid}-err`} error={error} />
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const auto = useId(); const fid = id ?? auto
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={fid}>{label}</Label>}
        <select ref={ref} id={fid} aria-invalid={!!error || undefined} {...props} className={cn(field(error), 'h-10', className)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <FieldError id={`${fid}-err`} error={error} />
      </div>
    )
  },
)
Select.displayName = 'Select'
