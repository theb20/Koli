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
