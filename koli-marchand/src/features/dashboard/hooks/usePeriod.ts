import { useMemo, useState } from 'react'
import type { DashboardPeriod, PeriodRange } from '@/types/dashboard'

export const PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '12m', label: '12 mois' },
  { key: 'custom', label: 'Personnalisé' },
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Centralise la résolution période → plage de dates, réutilisée par le
 * sélecteur du header, les KPI et les graphiques — une seule source de
 * vérité pour éviter que le sélecteur et les données affichées divergent. */
export function usePeriod() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null)

  const range = useMemo<PeriodRange>(() => {
    const now = new Date()
    if (period === 'custom' && customRange) {
      return { key: 'custom', label: 'Personnalisé', from: customRange.from, to: customRange.to }
    }
    if (period === 'today') {
      return { key: 'today', label: "Aujourd'hui", from: startOfDay(now), to: now }
    }
    if (period === '7d') {
      return { key: '7d', label: '7 jours', from: new Date(startOfDay(now).getTime() - 6 * 86400000), to: now }
    }
    if (period === '12m') {
      return { key: '12m', label: '12 mois', from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: now }
    }
    return { key: '30d', label: '30 jours', from: new Date(startOfDay(now).getTime() - 29 * 86400000), to: now }
  }, [period, customRange])

  return { period, setPeriod, customRange, setCustomRange, range }
}
