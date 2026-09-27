import { Info } from 'lucide-react'
import { DeltaBadge } from '../../components/ui/Stat'
import { Skeleton } from '../../components/ui/States'
import { Sparkline } from '../../components/charts/Sparkline'
import { cn } from '../../lib/cn'
import { METRICS, deltaOf, formatMetric, valueOf, type MetricKey } from './metrics'
import type { KpiResponse } from './api'

/** 12 KPI cliquables : valeur, variation vs comparaison, mini-courbe. */
export function KpiGrid({ data, selected, onSelect }: { data?: KpiResponse; selected: MetricKey; onSelect: (k: MetricKey) => void }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[18px]">
        {METRICS.map(m => <div key={m.key} className="bg-card border border-line rounded-card p-[22px] space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-32" /></div>)}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[18px]" role="radiogroup" aria-label="Indicateur affiché dans le graphique">
      {METRICS.map(m => {
        const cur = valueOf(data.current, m.key)
        const d = data.previous ? deltaOf(m.kind, cur, valueOf(data.previous, m.key)) : null
        const spark = m.point ? data.series.map(p => m.point!(p) ?? 0) : null
        const isSel = m.key === selected
        return (
          <button key={m.key} type="button" role="radio" aria-checked={isSel} onClick={() => onSelect(m.key)}
            className={cn(
              'text-left bg-card border rounded-card p-[18px] sm:p-[22px] transition-colors min-w-0',
              isSel ? 'border-primary ring-1 ring-primary' : 'border-line hover:border-muted',
            )}>
            <span className="flex items-center gap-1.5 text-secondary sm:text-body text-ink-2">
              <span className="truncate">{m.label}</span>
              <span title={m.help} aria-label={m.help} className="text-muted shrink-0"><Info size={13} /></span>
            </span>
            <span className="mt-2 flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className={cn('block text-[20px] sm:text-kpi font-medium leading-none tabular truncate', isSel ? 'text-primary' : 'text-ink')}>
                  {formatMetric(m.kind, cur)}
                </span>
                <span className="mt-2 block min-h-5">
                  {d && <DeltaBadge value={d.value} unit={d.unit} invert={m.lowerIsBetter} />}
                </span>
              </span>
              {spark && spark.length > 1 && <Sparkline values={spark} width={64} height={28} tone="neutral" className="hidden sm:block shrink-0" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
