/* ── Tableau de bord marchand — types dédiés ─────────────────
   Chaque indicateur correspond à une fiche du dictionnaire des métriques
   (backend/src/lib/sellerMetrics/dictionary.ts). Aucun champ « visiteurs »
   ou « conversion » : aucun suivi de trafic n'existe encore — mieux vaut
   l'absence du champ qu'une valeur inventée. */

/* Préréglages de période — les bornes sont calculées par le SERVEUR, en
   Africa/Abidjan (GET /api/seller/overview?preset=…), jamais dans le
   navigateur (dont le fuseau peut différer). */
export type DashboardPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom'

export interface PeriodRange {
  key: DashboardPeriod
  label: string
  /** AAAA-MM-JJ, inclus — seulement pour « Personnalisé » */
  from?: string
  to?: string
}

/* ── Accueil (GET /api/seller/overview) — chaque indicateur correspond à
   une fiche du dictionnaire (GET /api/seller/metrics/dictionary). ── */
export interface OverviewDelta { abs: number; pct: number | null }

export interface OverviewKpi {
  current: number
  previous: number
  lastYear: number
  vsPrevious: OverviewDelta
  vsLastYear: OverviewDelta
  sparkline: number[] | null
}

export interface SellerOverview {
  preset: DashboardPeriod
  period: { from: string; to: string; timezone: string }
  kpis: {
    revenueHt: OverviewKpi
    validOrders: OverviewKpi
    avgBasket: OverviewKpi
    newCustomers: OverviewKpi
    netRevenue: OverviewKpi & { coveragePct: number | null }
    returnRate: OverviewKpi & { returnedUnits: number; returnedValue: number }
    stockAtRisk: { current: number; atRisk: number; outOfStock: number; products: { id: number; name: string; stock: number; days: number }[] }
  }
  alerts: { id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string; link: string }[]
}

export interface MetricDefinition {
  id: string
  name: string
  definition: string
  formula: string
  included: string
  excluded: string
  source: string
  refresh: string
  owner: string
}


