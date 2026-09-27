import axios from 'axios'

export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

/* ── Auth header depuis localStorage ─────────────────────── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('koli_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ── Refresh silencieux — un seul en vol à la fois ───────── */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${BASE}/api/auth/refresh`, {}, { withCredentials: true })
      .then(res => res.data?.data?.accessToken ?? null)
      .catch(() => null)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

/* Routes d'authentification publiques : leur 401 est une réponse métier
   (ex. mauvais mot de passe) à afficher dans le formulaire — jamais un
   jeton expiré. Sans cette exclusion, un échec de connexion rechargeait
   /login et effaçait le message d'erreur. */
const PUBLIC_AUTH = ['/api/auth/refresh', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password']

/* ── 401 → tente un refresh une fois, sinon déconnexion ──── */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const url = typeof original?.url === 'string' ? original.url : ''
    if (PUBLIC_AUTH.some(p => url.includes(p))) return Promise.reject(err)
    const isRefreshCall = url.includes('/api/auth/refresh')

    if (err.response?.status === 401 && original && !original._retried && !isRefreshCall) {
      original._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        localStorage.setItem('koli_admin_token', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('koli_admin_token')
      localStorage.removeItem('koli_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/* ── Helpers formatage ───────────────────────────────────── */
export const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
