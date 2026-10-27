import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { MetricDefinition, PeriodRange, SellerOverview } from '@/types/dashboard'

/* Accueil du tableau de bord — tous les chiffres sont calculés par le
   serveur (SQL, commandes PAYÉES uniquement) : aucune formule ici. */
export function useSellerOverview(range: PeriodRange) {
  const qs = new URLSearchParams({ preset: range.key, ...(range.key === 'custom' && range.from && range.to ? { from: range.from, to: range.to } : {}) })
  return useQuery({
    queryKey: ['seller-overview', range.key, range.from, range.to],
    queryFn: async () => unwrap<SellerOverview>(await api.get(`/api/seller/overview?${qs}`)),
    enabled: range.key !== 'custom' || (!!range.from && !!range.to),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Fiches du dictionnaire des métriques (infobulles et panneau « Définitions »). */
export function useMetricsDictionary() {
  return useQuery({
    queryKey: ['seller-metrics-dictionary'],
    queryFn: async () => {
      const data = unwrap<{ metrics: MetricDefinition[] }>(await api.get('/api/seller/metrics/dictionary'))
      return Object.fromEntries(data.metrics.map(m => [m.id, m])) as Record<string, MetricDefinition>
    },
    staleTime: Infinity,
  })
}
