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
 * Crée un lien de paiement WiniPayer via merchantgo — remplace PayDunya
 * comme passerelle de paiement en ligne (voir order_payment_architecture) :
 * toute la logique de paiement vit désormais dans merchantgo, backend/ ne
 * fait que relayer la création et se faire notifier au retour.
 */
export function createWinipayerPayment(input: {
  orderId: string
  orderNumber: string
  amount: number
  description: string
  returnUrl: string
  cancelUrl: string
}) {
  return merchantgoRequest<{ success: boolean; data: { checkoutUrl: string; providerRef: string } }>(
    `/api/v1/internal/payments/winipayer/create`,
    { method: 'POST', body: input },
  )
}

/**
 * Force une revérification en direct d'un paiement WiniPayer auprès de
 * merchantgo (qui revérifie lui-même auprès de WiniPayer, jamais de
 * confiance dans un statut local périmé) — utilisé par la page de retour
 * client quand le webhook n'est peut-être pas encore arrivé. Si le paiement
 * est dans un état terminal, merchantgo rappelle lui-même mark-paid /
 * mark-cancelled sur ce backend avant de répondre ici.
 */
export function refreshWinipayerPayment(providerRef: string) {
  return merchantgoRequest<{ success: boolean; data: { state: string; operatorRef?: string } }>(
    `/api/v1/internal/payments/winipayer/${encodeURIComponent(providerRef)}/refresh`,
    { method: 'POST' },
  )
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

/**
 * Vue admin du modèle économique de chaque marchand (koli-admin affiche le
 * plan/mode dans la liste des marchands) — une seule requête groupée plutôt
 * qu'un appel par marchand.
 */
export function getMerchantBillingBulk(userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve({ success: true, data: {} })
  return merchantgoRequest(`/api/v1/admin/billing/bulk`, { method: 'POST', body: { userIds } })
}

/**
 * Modifie le modèle économique d'un marchand depuis koli-admin — contrairement
 * au choix fait par le marchand lui-même (jamais de commissionRate libre, cf.
 * koli-marchand), un admin peut fixer un taux personnalisé et n'est jamais
 * bloqué par le verrou de 30 jours.
 */
export function setMerchantBilling(userId: string, body: { mode: 'commission' | 'subscription'; commissionRate?: number; subscriptionPlanId?: string }) {
  return merchantgoRequest(`/api/v1/admin/billing/${userId}`, { method: 'PUT', body })
}
