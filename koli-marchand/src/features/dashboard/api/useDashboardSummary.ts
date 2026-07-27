import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import { getBilling, getWalletBalance } from '@/lib/merchantgo'
import type { DashboardFinance, DashboardSummary, PeriodRange } from '@/types/dashboard'

function toQuery(range: PeriodRange) {
  if (range.key === 'custom') {
    return `from=${range.from.toISOString()}&to=${range.to.toISOString()}`
  }
  return `period=${range.key}`
}

export function useDashboardSummary(range: PeriodRange) {
  return useQuery({
    queryKey: ['dashboard-summary', range.key, range.from.getTime(), range.to.getTime()],
    queryFn: async () => unwrap<DashboardSummary>(await api.get(`/api/seller/dashboard/summary?${toQuery(range)}`)),
    staleTime: 30_000,
  })
}

/* Séparé de useDashboardSummary : la commission/le solde viennent de
 * merchantgo, jamais de backend/ (cf. règle d'architecture paiements —
 * voir memory order_payment_architecture). Le taux appliqué est celui
 * réellement en vigueur pour ce marchand (mode commission personnel, ou
 * taux du plan en mode abonnement) — merchantgo le résout déjà. */
export function useDashboardFinance(summary: DashboardSummary | undefined) {
  return useQuery({
    queryKey: ['dashboard-finance', summary?.period.from, summary?.period.to],
    queryFn: async (): Promise<DashboardFinance> => {
      const [billing, wallet] = await Promise.all([getBilling(), getWalletBalance()])
      const rate = billing.mode === 'subscription' ? (billing.subscription_plan?.commission_rate ?? billing.commission_rate) : billing.commission_rate
      const commission = Math.round((summary!.revenue.current * rate) / 100)
      const netRevenueSeries = summary!.revenueSeries.map((p) => ({ ...p, amount: Math.round(p.amount * (1 - rate / 100)) }))
      return {
        commissionRate: rate,
        commission,
        netRevenue: summary!.revenue.current - commission,
        netRevenueSeries,
        walletBalance: wallet.balance,
      }
    },
    enabled: !!summary,
    staleTime: 30_000,
  })
}
