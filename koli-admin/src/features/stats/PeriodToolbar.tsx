import { Download } from 'lucide-react'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { PRESET_LABELS, type Preset, type usePeriod } from './period'
import type { Compare } from './api'

const COMPARE_LABELS: Record<Compare, string> = { previous: 'Période précédente', year: 'Même période N-1', none: 'Sans comparaison' }

const dateInput = 'h-9 px-2.5 rounded-input border border-line bg-card text-secondary text-ink focus:border-primary tabular'

export function PeriodToolbar({ period, compareRange, onExport, exporting }: {
  period: ReturnType<typeof usePeriod>
  compareRange: { from: string; to: string } | null | undefined
  onExport: () => void
  exporting?: boolean
}) {
  const presetTabs = (Object.keys(PRESET_LABELS) as Exclude<Preset, 'custom'>[]).map(p => ({ value: p, label: PRESET_LABELS[p] }))
  const lastDay = compareRange ? new Date(new Date(compareRange.to).getTime() - 86_400_000) : null

  return (
    <div className="bg-card border border-line rounded-card p-4 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4">
      <Tabs label="Période" tabs={[...presetTabs, { value: 'custom', label: 'Personnalisée' }]}
        value={period.preset}
        onChange={v => v === 'custom' ? period.setCustom(period.from, period.to) : period.setPreset(v)} />

      <div className={cn('flex items-center gap-2', period.preset !== 'custom' && 'opacity-70')}>
        <label className="sr-only" htmlFor="stats-from">Du</label>
        <input id="stats-from" type="date" className={dateInput} value={period.from} max={period.to}
          onChange={e => e.target.value && period.setCustom(e.target.value, period.to)} />
        <span className="text-caption text-muted">au</span>
        <label className="sr-only" htmlFor="stats-to">Au</label>
        <input id="stats-to" type="date" className={dateInput} value={period.to} min={period.from}
          onChange={e => e.target.value && period.setCustom(period.from, e.target.value)} />
      </div>

      <div className="flex items-center gap-2 xl:ml-auto">
        <label htmlFor="stats-compare" className="text-caption text-muted whitespace-nowrap">Comparer à</label>
        <select id="stats-compare" value={period.compare} onChange={e => period.setCompare(e.target.value as Compare)}
          className="h-9 px-2.5 rounded-input border border-line bg-card text-secondary text-ink focus:border-primary">
          {(Object.keys(COMPARE_LABELS) as Compare[]).map(c => <option key={c} value={c}>{COMPARE_LABELS[c]}</option>)}
        </select>
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={onExport} loading={exporting}>Exporter</Button>
      </div>

      {compareRange && lastDay && (
        <p className="xl:hidden text-caption text-muted">
          Comparé au {formatDate(compareRange.from, 'medium')} – {formatDate(lastDay, 'medium')}
        </p>
      )}
    </div>
  )
}
