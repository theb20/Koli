/* Période de la Vue d'ensemble financière — gardée dans l'URL (?p=…&from=&to=) pour être partageable. */
import { useSearchParams } from 'react-router-dom'
import type { FinancePreset } from './api'

export const PERIOD_LABELS: Record<FinancePreset, string> = { month: 'Mois en cours', quarter: 'Trimestre', year: 'Année en cours', custom: 'Personnalisé' }
export const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function useFinancePeriod() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('p') as FinancePreset | null
  const preset: FinancePreset = raw && raw in PERIOD_LABELS ? raw : 'month'
  const from = isDate(params.get('from')) ? params.get('from')! : undefined
  const to = isDate(params.get('to')) ? params.get('to')! : undefined
  const set = (next: { p: FinancePreset; from?: string; to?: string }) => {
    const p = new URLSearchParams(params)
    p.set('p', next.p)
    if (next.from && next.to) { p.set('from', next.from); p.set('to', next.to) } else { p.delete('from'); p.delete('to') }
    setParams(p, { replace: true })
  }
  return { preset, from, to, set }
}
