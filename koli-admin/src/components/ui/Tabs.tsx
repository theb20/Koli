import { cn } from '../../lib/cn'

type Tab<T extends string> = { value: T; label: string; count?: number }

/** Onglets en pilules sur fond gris clair (role="tablist"). */
export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: Tab<T>[]; value: T; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 p-1 rounded-cta bg-muted-fill max-w-full overflow-x-auto">
      {tabs.map(t => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'h-8 px-3 rounded-input text-secondary whitespace-nowrap transition-colors',
            value === t.value ? 'bg-card text-ink font-medium border border-line' : 'text-ink-2 hover:text-ink',
          )}>
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-micro text-muted tabular">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
