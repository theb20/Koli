export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4100'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('proforma_token')
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  // credentials: 'include' est indispensable ici — sans lui, fetch() traite
  // toute requête cross-origin (front :5175 vers API :4100) comme si les
  // identifiants étaient omis : le cookie httpOnly posé par /auth/login
  // n'est alors JAMAIS stocké par le navigateur, ce qui casse silencieusement
  // tout ce qui dépend ensuite de ce cookie (téléchargement PDF/CSV par
  // navigation directe, flux SSE des notifications).
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    throw new ApiError(data?.message || `Erreur ${res.status}`, res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => apiFetch<T>(path, { method: 'POST', body: form }),
}

export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

/**
 * Le PDF s'ouvre via navigation directe (nouvel onglet / iframe), pas via
 * fetch : le cookie httpOnly posé à la connexion (SameSite=Lax) suffit sur
 * une navigation top-level, pas besoin de transmettre le Bearer token ici.
 */
export function pdfUrl(kind: 'proformas' | 'invoices', id: string): string {
  return `${API_BASE}/api/${kind}/${id}/pdf`
}
