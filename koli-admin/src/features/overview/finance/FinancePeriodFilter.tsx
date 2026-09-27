import { useState } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import { Button } from '../../../components/ui/Button'
import { formatDate } from '../../../lib/format'
import type { FinancePreset } from './api'
import { PERIOD_LABELS, isDate, type useFinancePeriod } from './period'

export function FinancePeriodFilter({ period, range }: { period: ReturnType<typeof useFinancePeriod>; range?: { from: string; to: string } }) {
  const [custom, setCustom] = useState({ from: period.from ?? '', to: period.to ?? '' })
  const [editing, setEditing] = useState(period.preset === 'custom' && !(period.from && period.to))
  const customValid = isDate(custom.from) && isDate(custom.to) && custom.from <= custom.to
  // Pendant la saisie des dates, l'onglet « Personnalisé » est actif mais les
  // indicateurs restent sur la période précédente jusqu'à « Appliquer ».
  const shown: FinancePreset = editing ? 'custom' : period.preset

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <Tabs label="Période des indicateurs" value={shown}
          tabs={(Object.keys(PERIOD_LABELS) as FinancePreset[]).map(p => ({ value: p, label: PERIOD_LABELS[p] }))}
          onChange={p => {
            if (p === 'custom') { setEditing(true); return }
            setEditing(false)
            period.set({ p })
          }} />
        {range && !editing && (
          <p className="text-secondary text-muted">Du {formatDate(range.from, 'long')} au {formatDate(range.to, 'long')}</p>
        )}
      </div>
      {editing && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (customValid) { period.set({ p: 'custom', ...custom }); setEditing(false) } }}>
          <label className="flex flex-col gap-1 text-caption text-ink-2">Du
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
              className="h-9 px-2.5 rounded-input border border-line bg-card text-body text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-caption text-ink-2">Au
            <input type="date" value={custom.to} min={custom.from || undefined} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
              className="h-9 px-2.5 rounded-input border border-line bg-card text-body text-ink" />
          </label>
          <Button type="submit" size="sm" disabled={!customValid}>Appliquer</Button>
        </form>
      )}
      {period.preset === 'custom' && !editing && (
        <Button variant="subtle" size="xs" onClick={() => setEditing(true)}>Modifier les dates</Button>
      )}
    </div>
  )
}
