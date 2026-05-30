import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          ref={ref}
          {...props}
          className={`w-full bg-white border ${error ? 'border-red-400' : 'border-slate-300'} rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all ${icon ? 'pl-9' : ''} ${className}`}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>}
      <textarea
        ref={ref}
        {...props}
        className={`w-full bg-white border ${error ? 'border-red-400' : 'border-slate-300'} rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none ${className}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>}
      <select
        ref={ref}
        {...props}
        className={`w-full bg-white border ${error ? 'border-red-400' : 'border-slate-300'} rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
