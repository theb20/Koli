import type { RegisterFormData } from '../pages/register/types'

export const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
export const MERCHANTGO_URL = import.meta.env.VITE_MERCHANTGO_URL ?? 'http://localhost:8080'

const ACCESS_TOKEN_KEY = 'koli_business_access_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function hasAccessToken(): boolean {
  return !!getAccessToken()
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.message ?? `Erreur ${res.status}`, res.status)
  }
  return body
}

/* ── Compte (backend/ Node) ──────────────────────────────────────
   Créé une fois que les étapes 1 (compte) et 3 (naissance requise
   pour l'inscription) sont complètes — cf. RegisterPage.tsx. */
export async function registerAccount(data: RegisterFormData): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include', // nécessaire pour recevoir le cookie httpOnly refresh_token (voir refreshAccessToken)
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom: data.prenom,
      nom: data.nom,
      email: data.email,
      password: data.password,
      telephone: data.telephone || undefined,
      naissance: data.dateNaissance,
    }),
  })
  const body = await parseJsonOrThrow(res)
  setAccessToken(body.data.accessToken)
}

/*
 * L'access token expire au bout de 15 minutes (JWT_EXPIRES_IN côté
 * backend/) — largement dépassable pendant une inscription réelle (10
 * étapes, 3 documents KYC à uploader). Sans ce rafraîchissement silencieux,
 * chaque appel merchantgo après expiration échouait en 401, bloquant la
 * suite de l'inscription sans message clair pour l'utilisateur.
 */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BACKEND_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(body => body?.data?.accessToken ?? null)
      .catch(() => null)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

/* ── Vérification e-mail (étape 2, avant création du compte) ─────── */
export async function sendVerificationCode(email: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/merchant-onboarding/email-verification/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  await parseJsonOrThrow(res)
}

export async function confirmVerificationCode(email: string, code: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/merchant-onboarding/email-verification/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  await parseJsonOrThrow(res)
}

/* ── Upload de fichiers (backend/ → stockgo) ─────────────────────── */
export type UploadBucket =
  | 'photo-profil' | 'logo-boutique' | 'banniere-boutique'
  | 'document-identite' | 'selfie' | 'justificatif-domicile'

export async function uploadFile(bucket: UploadBucket, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', bucket)

  async function attempt() {
    return fetch(`${BACKEND_URL}/api/merchant-onboarding/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body: form,
    })
  }

  let res = await attempt()
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      setAccessToken(newToken)
      res = await attempt()
    }
  }
  const body = await parseJsonOrThrow(res)
  return body.data.url as string
}

/* ── Candidature marchand (merchantgo) ───────────────────────────
   Les noms de champs de ApplicationPayload correspondent volontairement
   1:1 aux json tags de saveDraftRequest côté merchantgo (steps 3 à 10). */
export type ApplicationPayload = Omit<
  RegisterFormData,
  | 'prenom' | 'nom' | 'email' | 'telephone' | 'password' | 'acceptedTerms'
  | 'emailVerified'
  | 'photoProfil' | 'logoBoutique' | 'banniereBoutique'
  | 'documentIdentite' | 'selfie' | 'justificatifDomicile'
  | 'billingMode' | 'subscriptionPlanId'
>

export function buildApplicationPayload(data: RegisterFormData): ApplicationPayload {
  const {
    prenom: _prenom, nom: _nom, email: _email, telephone: _telephone, password: _password, acceptedTerms: _acceptedTerms,
    emailVerified: _emailVerified,
    photoProfil: _photoProfil, logoBoutique: _logoBoutique, banniereBoutique: _banniereBoutique,
    documentIdentite: _documentIdentite, selfie: _selfie, justificatifDomicile: _justificatifDomicile,
    billingMode: _billingMode, subscriptionPlanId: _subscriptionPlanId,
    ...payload
  } = data
  return payload
}

async function merchantgoRequest(path: string, init: RequestInit) {
  const attempt = () => fetch(`${MERCHANTGO_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...init.headers,
    },
  })

  let res = await attempt()
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      setAccessToken(newToken)
      res = await attempt()
    }
  }
  return parseJsonOrThrow(res)
}

export async function saveApplicationDraft(data: RegisterFormData) {
  return merchantgoRequest('/api/v1/applications/me', {
    method: 'PUT',
    body: JSON.stringify(buildApplicationPayload(data)),
  })
}

export async function submitApplication() {
  return merchantgoRequest('/api/v1/applications/me/submit', { method: 'POST' })
}

export async function getMyApplication() {
  return merchantgoRequest('/api/v1/applications/me', { method: 'GET' })
}

/* ── Modèle économique (merchantgo) ──────────────────────────────
   Choisi pendant l'inscription, avant même l'approbation KYC — le
   marchand démarre directement avec le mode voulu au lieu du défaut
   commission 5%. Reste modifiable plus tard dans koli-marchand. */
export type SubscriptionPlan = {
  id: string
  slug: string
  name: string
  max_products: number
  max_employees: number
  max_orders: number
  storage_limit_mb: number
  commission_rate: number
  price_monthly: number
  price_yearly: number
  features: string // tableau JSON sérialisé
  is_active: boolean
  position: number
}

// Lecture publique — pas de JWT requis (utilisé aussi bien avant la
// création du compte, sur la page vitrine, que pendant l'inscription).
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${MERCHANTGO_URL}/api/v1/subscription-plans`)
  const body = await parseJsonOrThrow(res)
  return body.data as SubscriptionPlan[]
}

export async function saveMerchantBilling(data: RegisterFormData) {
  return merchantgoRequest('/api/v1/merchant/billing', {
    method: 'PUT',
    body: JSON.stringify({
      mode: data.billingMode,
      subscriptionPlanId: data.billingMode === 'subscription' ? data.subscriptionPlanId : undefined,
    }),
  })
}
