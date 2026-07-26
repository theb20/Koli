/* ─────────────────────────────────────────────────────────────
   Client pour les routes admin du service merchantgo (../merchantgo) —
   koli-admin ne parle jamais directement à merchantgo : ADMIN_API_KEY est
   un secret de service statique, l'exposer au navigateur permettrait à
   n'importe qui d'approuver/rejeter des candidatures marchand sans jamais
   se connecter à koli-admin. Ce module reste donc côté serveur, et les
   routes /api/admin/merchant-applications (requireAdmin) le consomment.
───────────────────────────────────────────────────────────── */

const MERCHANTGO_URL      = process.env.MERCHANTGO_URL
const MERCHANTGO_ADMIN_API_KEY = process.env.MERCHANTGO_ADMIN_API_KEY

export function isMerchantgoConfigured(): boolean {
  return Boolean(MERCHANTGO_URL && MERCHANTGO_ADMIN_API_KEY)
}

export class MerchantgoError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Relaie une requête vers /api/v1/admin/... de merchantgo. `adminId` est
 * transmis en X-Admin-Id pour que le journal d'audit de merchantgo
 * enregistre quel admin a agi, plutôt qu'un générique "admin-service".
 */
async function merchantgoRequest<T>(path: string, opts: { method?: string; body?: unknown; adminId?: string } = {}): Promise<T> {
  if (!isMerchantgoConfigured()) {
    throw new MerchantgoError('Merchantgo non configuré (MERCHANTGO_URL / MERCHANTGO_ADMIN_API_KEY manquants)', 500)
  }

  const res = await fetch(`${MERCHANTGO_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'X-API-Key': MERCHANTGO_ADMIN_API_KEY!,
      'Content-Type': 'application/json',
      ...(opts.adminId ? { 'X-Admin-Id': opts.adminId } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const data = await res.json().catch(() => ({})) as { message?: string }
  if (!res.ok) {
    throw new MerchantgoError(data.message ?? `Erreur merchantgo (${res.status})`, res.status)
  }
  return data as T
}

export function listMerchantApplications(query: string) {
  return merchantgoRequest(`/api/v1/admin/applications${query}`)
}

export function getMerchantApplication(id: string) {
  return merchantgoRequest(`/api/v1/admin/applications/${id}`)
}

export function approveMerchantApplication(id: string, adminId: string, note?: string) {
  return merchantgoRequest(`/api/v1/admin/applications/${id}/approve`, { method: 'POST', body: { note }, adminId })
}

export function rejectMerchantApplication(id: string, adminId: string, reason: string) {
  return merchantgoRequest(`/api/v1/admin/applications/${id}/reject`, { method: 'POST', body: { reason }, adminId })
}

/**
 * Enregistre la vente d'un marchand une fois sa commande (ou sa part d'une
 * commande) réellement payée — merchantgo calcule et journalise la
 * commission (mode commission ou abonnement) et crédite son solde. Voir
 * lib/merchantWallet.ts pour le regroupement par boutique en amont.
 * Idempotent côté merchantgo (order_id + user_id) : un appel répété pour
 * la même commande ne double-compte jamais.
 */
export function recordMerchantSale(input: { userId: string; orderId: string; orderNumber: string; grossAmount: number }) {
  return merchantgoRequest(`/api/v1/internal/orders/paid`, { method: 'POST', body: input })
}

/**
 * Gestion admin des plans d'abonnement — CRUD relayé vers merchantgo
 * (koli-admin n'appelle jamais merchantgo directement, cf. en-tête).
 */
export type SubscriptionPlanBody = {
  slug: string
  name: string
  maxProducts: number
  maxEmployees: number
  maxOrders: number
  storageLimitMb: number
  commissionRate: number
  priceMonthly: number
  priceYearly: number
  features: string
  isActive: boolean
  position: number
}

export function listSubscriptionPlans(all: boolean) {
  return merchantgoRequest(`/api/v1/admin/subscription-plans${all ? '?all=true' : ''}`)
}

export function createSubscriptionPlan(body: SubscriptionPlanBody) {
  return merchantgoRequest(`/api/v1/admin/subscription-plans`, { method: 'POST', body })
}

export function updateSubscriptionPlan(id: string, body: SubscriptionPlanBody) {
  return merchantgoRequest(`/api/v1/admin/subscription-plans/${id}`, { method: 'PUT', body })
}

export function deleteSubscriptionPlan(id: string) {
  return merchantgoRequest(`/api/v1/admin/subscription-plans/${id}`, { method: 'DELETE' })
}
