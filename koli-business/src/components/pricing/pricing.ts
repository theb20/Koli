/* Types et calculs d'affichage de la section Tarifs (données : plans
   d'abonnement merchantgo, voir lib/api.ts → getSubscriptionPlans). */
import type { SubscriptionPlan } from '../../lib/api'

export type PaymentFrequency = 'monthly' | 'yearly'

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = { monthly: 'Mensuel', yearly: 'Annuel' }

export type PricingTier = {
  id: string
  name: string
  price: Record<PaymentFrequency, number>
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  popular?: boolean
}

const NBSP = '\u00A0'
/** 15000 → "15 000" (séparateur de milliers : espace insécable) */
export function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/[\u202F\u00A0 ]/g, NBSP)
}

/** 15000 → "15 000 F CFA" */
export const formatXof = (n: number) => `${formatAmount(n)}${NBSP}F${NBSP}CFA`

/** Économie annuelle (%) par rapport à 12 mensualités — null si aucune. */
export function yearlySavingPct(monthly: number, yearly: number): number | null {
  if (monthly <= 0 || yearly <= 0 || yearly >= monthly * 12) return null
  return Math.round((1 - yearly / (monthly * 12)) * 100)
}

function parseFeatures(raw: string): string[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((f): f is string => typeof f === 'string') : []
  } catch {
    return []
  }
}

/** Plan merchantgo → carte de tarif. Le plan « pro » est mis en avant. */
export function planToTier(plan: SubscriptionPlan): PricingTier {
  const free = plan.price_monthly === 0 && plan.price_yearly === 0
  return {
    id: plan.id,
    name: plan.name,
    price: { monthly: plan.price_monthly, yearly: plan.price_yearly },
    description: plan.commission_rate > 0 ? `Commission de ${plan.commission_rate.toLocaleString('fr-FR')} % sur vos ventes` : 'Aucune commission sur vos ventes',
    features: parseFeatures(plan.features),
    cta: free ? 'Commencer' : 'Choisir ce plan',
    href: '/inscription',
    highlighted: plan.slug === 'pro',
    popular: plan.slug === 'pro',
  }
}
