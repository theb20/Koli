import type { ChangeEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const fieldClass = 'w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors'

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-[11px] font-medium text-ink-dim uppercase tracking-wide mb-1.5">{children}</label>
}

export function TextField({ label, value, onChange, placeholder, className, maxLength }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; maxLength?: number
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <input value={value} maxLength={maxLength} placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} className={fieldClass} />
    </div>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3, className }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <textarea value={value} rows={rows} placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        className={cn(fieldClass, 'h-auto py-2 resize-none')} />
    </div>
  )
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix, className }: {
  label?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; className?: string
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))} className={cn(fieldClass, suffix && 'pr-7')} />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint pointer-events-none">{suffix}</span>}
      </div>
    </div>
  )
}

export function SelectField<T extends string>({ label, value, onChange, options, className }: {
  label?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={e => onChange(e.target.value as T)} className={cn(fieldClass, 'cursor-pointer')}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function ColorField({ label, value, onChange, className }: { label?: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <label className="relative w-9 h-9 rounded-lg border border-border overflow-hidden shrink-0 cursor-pointer" style={{ background: value }}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={e => onChange(e.target.value)}
            className="absolute -inset-2 cursor-pointer opacity-0" />
        </label>
        <input value={value} onChange={e => onChange(e.target.value)} className={fieldClass} />
      </div>
    </div>
  )
}

export function ToggleField({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn('flex items-center justify-between gap-3 cursor-pointer select-none', className)}>
      <span className="text-[13px] text-ink">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', checked ? 'bg-accent' : 'bg-border-strong')}>
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function AlignField({ label, value, onChange }: { label?: string; value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void }) {
  const options: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right']
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {options.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={cn('px-3 h-8 text-[12px] capitalize transition-colors', value === o ? 'bg-accent text-accent-ink' : 'bg-surface text-ink-dim hover:bg-black/5')}>
            {o === 'left' ? 'Gauche' : o === 'center' ? 'Centre' : 'Droite'}
          </button>
        ))}
      </div>
    </div>
  )
}
