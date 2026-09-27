/* Indicateurs financiers — GET /api/admin/finance/overview. Tous les calculs
   sont faits côté serveur (backend/src/lib/finance) : ce module ne fait que
   typer et transporter les valeurs, aucune formule ici. */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type FinancePreset = 'month' | 'quarter' | 'year' | 'custom'

export type FinanceOverview = {
  preset: FinancePreset
  range: { from: string; to: string }
  volume: {
    revenueTtcAllTime: number
    revenueTtcYear: number
    revenueTtcMonth: number
    revenueTtcPrevMonthSamePeriod: number
    monthChangePct: number | null
    revenueTtc: number
    revenueHt: number
    orders: number
    avgBasketTtc: number
  }
  costs: { cogs: number; supplierPayout: number; vatCollected: number; shippingCost: number }
  profit: {
    grossMargin: number
    productMargin: number
    services: number
    marginRatePct: number | null
    commissions: number
    shippingResult: number
    avgMarginPerOrder: number
    topProducts: { id: number; name: string; image: string | null; qty: number; margin: number; marginRate: number | null }[]
    topSuppliers: { kind: 'supplier' | 'merchant' | 'none'; id: number | null; name: string | null; orders: number; margin: number }[]
  }
  coverage: {
    marginOrders: number
    marginRevenueHt: number
    excludedOrders: number
    excludedSharePct: number | null
    shippingUnknownOrders: number
  }
}

export function useFinanceOverview(preset: FinancePreset, from?: string, to?: string) {
  const qs = new URLSearchParams({ preset, ...(preset === 'custom' && from && to ? { from, to } : {}) })
  return useQuery({
    queryKey: ['overview', 'finance', preset, from, to],
    queryFn: async () => (await api.get(`/api/admin/finance/overview?${qs}`)).data.data as FinanceOverview,
    placeholderData: keepPreviousData,
    enabled: preset !== 'custom' || (!!from && !!to),
  })
}
