/* ── Cockpit marchand — types dédiés ─────────────────────────
   Tout ici correspond à une vraie source de données (GET /api/seller/
   dashboard/summary côté backend/, ou merchantgo pour la commission/le
   solde). Aucun champ "visiteurs"/"conversion" — aucun tracking de
   trafic n'existe dans la plateforme, mieux vaut l'absence du champ
   qu'une valeur inventée. */

export type DashboardPeriod = 'today' | '7d' | '30d' | '12m' | 'custom'

export interface PeriodRange {
  key: DashboardPeriod
  label: string
  from: Date
  to: Date
}

export interface TrendMetric {
  current: number
  previous: number
  changePct: number
}

export interface SeriesPoint {
  date: string
  label: string
  amount: number
}

export interface OrdersSeriesPoint {
  date: string
  label: string
  count: number
}

export interface DashboardSummary {
  period: { from: string; to: string; granularity: 'day' | 'month' }
  revenue: TrendMetric
  orders: TrendMetric
  avgBasket: TrendMetric
  products: { active: number; outOfStock: number }
  customers: { active: number; new: number; loyal: number }
  reviews: { count: number; avgRating: number }
  returns: { count: number }
  favorites: { count: number }
  revenueSeries: SeriesPoint[]
  ordersSeries: OrdersSeriesPoint[]
}

/* Ajoutées côté client à partir de merchantgo (jamais calculées par
   backend/ — cf. règle d'architecture paiements) une fois le taux de
   commission réel du marchand connu. */
export interface DashboardFinance {
  commissionRate: number
  commission: number
  netRevenue: number
  netRevenueSeries: SeriesPoint[]
  walletBalance: number
}

export type KpiColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate'

export interface KpiCardData {
  key: string
  label: string
  value: string
  changePct?: number
  sparkline?: number[]
  color: KpiColor
}
