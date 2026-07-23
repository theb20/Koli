import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass =
  'w-full rounded-xl border border-[#e8e8e4] px-3 py-2.5 text-sm bg-white focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors disabled:bg-[#f5f5f3] disabled:text-[#a3a3a1]'

interface FieldWrapperProps {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
  required?: boolean
}

function FieldWrapper({ label, htmlFor, error, children, required }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-[#0a0a0b] mb-1.5">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, id, required, className = '', ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} required={required}>
      <input id={id} className={`${fieldClass} ${className}`} aria-invalid={!!error} {...rest} />
    </FieldWrapper>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function TextAreaField({ label, error, id, required, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} required={required}>
      <textarea id={id} className={`${fieldClass} resize-none ${className}`} aria-invalid={!!error} {...rest} />
    </FieldWrapper>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export function SelectField({ label, error, id, required, options, className = '', ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} required={required}>
      <select id={id} className={`${fieldClass} ${className}`} aria-invalid={!!error} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
}
