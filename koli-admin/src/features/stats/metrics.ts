/* Définition des KPI : libellé, format, sens (hausse = bien ou mal), série. */
import { formatFCFA, formatNumber } from '../../lib/format'
import type { KpiValues, SeriesPoint } from './api'

export type MetricKey =
  | 'revenue' | 'orders' | 'avgBasket' | 'itemsPerOrder' | 'deliveryRate' | 'cancelRate'
  | 'returnRate' | 'avgDeliveryDays' | 'onlineShare' | 'newCustomers' | 'repeatRate' | 'assistanceRevenue'

type Kind = 'money' | 'count' | 'percent' | 'decimal' | 'days'

export type Metric = {
  key: MetricKey
  label: string
  help: string
  kind: Kind
  lowerIsBetter?: boolean
  /** Valeur d'un point de série (null si non calculable) — absent = pas de courbe */
  point?: (p: SeriesPoint) => number | null
}

const ratio = (a: number, b: number) => (b ? a / b : null)

export const METRICS: Metric[] = [
  { key: 'revenue', label: "Chiffre d'affaires", kind: 'money', help: 'Total TTC des commandes payées (hors annulées, remboursées et corbeille).', point: p => p.revenue },
  { key: 'orders', label: 'Commandes', kind: 'count', help: 'Toutes les commandes passées sur la période, quel que soit leur statut.', point: p => p.orders },
  { key: 'avgBasket', label: 'Panier moyen', kind: 'money', help: "Chiffre d'affaires ÷ nombre de commandes payées.", point: p => (p.paidOrders ? p.revenue / p.paidOrders : null) },
  { key: 'itemsPerOrder', label: 'Articles par commande', kind: 'decimal', help: "Nombre moyen d'articles dans une commande payée." },
  { key: 'deliveryRate', label: 'Taux de livraison', kind: 'percent', help: 'Commandes livrées ÷ commandes passées sur la période. Les commandes récentes pas encore livrées font baisser ce taux sur les périodes courtes.', point: p => ratio(p.delivered, p.orders) },
  { key: 'cancelRate', label: "Taux d'annulation", kind: 'percent', lowerIsBetter: true, help: 'Commandes annulées ÷ commandes passées.', point: p => ratio(p.cancelled, p.orders) },
  { key: 'returnRate', label: 'Taux de retour', kind: 'percent', lowerIsBetter: true, help: 'Commandes livrées ayant fait l\'objet d\'une demande de retour (hors retours annulés).' },
  { key: 'avgDeliveryDays', label: 'Délai de livraison', kind: 'days', lowerIsBetter: true, help: 'Délai moyen entre la commande et sa livraison.' },
  { key: 'onlineShare', label: 'Paiement en ligne', kind: 'percent', help: "Part du chiffre d'affaires payée en ligne (vs à la livraison).", point: p => ratio(p.onlineRevenue, p.revenue) },
  { key: 'newCustomers', label: 'Nouveaux clients', kind: 'count', help: 'Comptes clients créés sur la période.', point: p => p.newCustomers },
  { key: 'repeatRate', label: 'Clients récurrents', kind: 'percent', help: 'Part des commandes payées passées par un client ayant déjà commandé et payé auparavant.' },
  { key: 'assistanceRevenue', label: 'CA assistance technique', kind: 'money', help: "Revenu de l'option payante « Assistance technique » (100 % plateforme).", point: p => p.assistance },
]

export const METRIC = Object.fromEntries(METRICS.map(m => [m.key, m])) as Record<MetricKey, Metric>

export function formatMetric(kind: Kind, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  switch (kind) {
    case 'money':   return formatFCFA(v)
    case 'count':   return formatNumber(v)
    case 'percent': return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v * 100)}\u00A0%`
    case 'decimal': return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v)
    case 'days':    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v)}\u00A0j`
  }
}

export const valueOf = (k: KpiValues, key: MetricKey): number | null => k[key] as number | null

/**
 * Variation affichée : % d'évolution pour les montants/volumes, écart en
 * points pour les taux (plus lisible : « +2,1 pts » plutôt que « +8 % »).
 */
export function deltaOf(kind: Kind, cur: number | null, prev: number | null): { value: number; unit: 'pct' | 'pts' } | null {
  if (cur === null || prev === null) return null
  if (kind === 'percent') return { value: (cur - prev) * 100, unit: 'pts' }
  if (!prev) return null
  return { value: ((cur - prev) / prev) * 100, unit: 'pct' }
}
