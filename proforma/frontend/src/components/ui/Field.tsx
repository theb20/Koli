import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface WrapperProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FieldWrapper({ label, hint, error, required, children }: WrapperProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-semibold text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="text-[11px] text-muted">{hint}</span>}
      {error && <span className="text-[11px] font-medium text-danger">{error}</span>}
    </label>
  )
}

const baseInput =
  'h-10 w-full border border-border bg-white px-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:ring-1 focus:ring-brand transition-colors'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; required?: boolean }

export function Input({ label, hint, error, required, className = '', ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <input className={`${baseInput} ${error ? 'border-danger' : ''} ${className}`} {...rest} />
    </FieldWrapper>
  )
}

export function Textarea({
  label,
  hint,
  error,
  required,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string; required?: boolean }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <textarea className={`${baseInput} h-auto min-h-20 resize-y py-2 ${error ? 'border-danger' : ''} ${className}`} {...rest} />
    </FieldWrapper>
  )
}

export function Select({
  label,
  hint,
  error,
  required,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string; required?: boolean }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <select className={`${baseInput} ${error ? 'border-danger' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  )
}
