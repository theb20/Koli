import { useMemo, useState } from 'react'
import type { DashboardPeriod, PeriodRange } from '@/types/dashboard'

export const PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: '7d', label: '7 derniers jours' },
  { key: '30d', label: '30 derniers jours' },
  { key: 'month', label: 'Mois en cours' },
  { key: 'lastMonth', label: 'Mois précédent' },
  { key: 'quarter', label: 'Trimestre en cours' },
  { key: 'year', label: 'Année en cours' },
  { key: 'custom', label: 'Personnalisé' },
]

/** Période choisie dans l'en-tête. Les dates exactes sont calculées par le
 * serveur (fuseau Africa/Abidjan) : on n'envoie que le préréglage, ou les
 * deux dates AAAA-MM-JJ d'une période personnalisée. */
export function usePeriod() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null)

  const range = useMemo<PeriodRange>(() => {
    const label = PERIOD_OPTIONS.find(o => o.key === period)?.label ?? ''
    return period === 'custom'
      ? { key: 'custom', label, from: customRange?.from, to: customRange?.to }
      : { key: period, label }
  }, [period, customRange])

  return { period, setPeriod, customRange, setCustomRange, range }
}
