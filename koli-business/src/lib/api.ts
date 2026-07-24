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

  const res = await fetch(`${BACKEND_URL}/api/merchant-onboarding/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: form,
  })
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
>

export function buildApplicationPayload(data: RegisterFormData): ApplicationPayload {
  const {
    prenom: _prenom, nom: _nom, email: _email, telephone: _telephone, password: _password, acceptedTerms: _acceptedTerms,
    emailVerified: _emailVerified,
    photoProfil: _photoProfil, logoBoutique: _logoBoutique, banniereBoutique: _banniereBoutique,
    documentIdentite: _documentIdentite, selfie: _selfie, justificatifDomicile: _justificatifDomicile,
    ...payload
  } = data
  return payload
}

async function merchantgoRequest(path: string, init: RequestInit) {
  const res = await fetch(`${MERCHANTGO_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...init.headers,
    },
  })
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
