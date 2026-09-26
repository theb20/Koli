import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatDelta } from '../../lib/format'

/**
 * Pilule de variation : « +0,02 % ▲ » (vert) / « −0,02 % ▼ » (rouge).
 * variant="arrow" → « ↑ 12 % ». null → rien (pas de variation inventée).
 */
export function DeltaBadge({ value, variant = 'triangle' }: { value: number | null; variant?: 'triangle' | 'arrow' }) {
  if (value === null || !Number.isFinite(value)) return null
  const up = value >= 0
  const label = variant === 'arrow' ? formatDelta(Math.abs(value)).replace(/^[+−]/, '') : formatDelta(value)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 h-5 px-1.5 rounded-full border text-micro font-medium tabular whitespace-nowrap',
      up ? 'bg-up-bg border-up-border text-up' : 'bg-down-bg border-down-border text-down',
    )}
      aria-label={`${up ? 'Hausse' : 'Baisse'} de ${formatDelta(Math.abs(value)).replace(/^[+−]/, '')}`}>
      {variant === 'arrow' && (up ? <ArrowUp size={11} aria-hidden /> : <ArrowDown size={11} aria-hidden />)}
      {label}
      {variant === 'triangle' && (
        <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden className={up ? '' : 'rotate-180'}>
          <path d="M4 0L8 6H0z" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}

export type StatItem = {
  label: string
  value: ReactNode
  delta?: number | null
  highlight?: boolean   // valeur en vert forêt
}

/** KPI en colonnes séparées par des traits verticaux (≈80px de haut). */
export function StatRow({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((it, i) => (
        <div key={it.label}
          className={cn(
            'min-h-[80px] flex flex-col justify-center py-3',
            'lg:px-6 lg:first:pl-0',
            i > 0 && 'lg:border-l lg:border-line',
            i % 2 === 1 && 'pl-4 border-l border-line lg:pl-6',
            i >= 2 && 'border-t border-line lg:border-t-0',
          )}>
          <p className="text-body text-ink-2">{it.label}</p>
          <div className="mt-2 flex items-center gap-2.5 flex-wrap">
            <span className={cn('text-kpi font-medium leading-none tabular whitespace-nowrap', it.highlight ? 'text-primary' : 'text-ink')}>{it.value}</span>
            <DeltaBadge value={it.delta ?? null} />
          </div>
        </div>
      ))}
    </div>
  )
}
