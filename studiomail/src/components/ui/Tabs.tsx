import { cn } from '@/lib/cn'

export function Tabs<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-canvas border border-border', className)} role="tablist">
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 h-7 rounded-md text-[12px] font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-dim hover:text-ink',
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
