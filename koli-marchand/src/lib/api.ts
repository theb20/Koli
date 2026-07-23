import axios from 'axios'
import type { AuthResponse } from '@/types'

export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export const ACCESS_TOKEN_KEY = 'koli_marchand_access_token'
export const REFRESH_TOKEN_KEY = 'koli_marchand_refresh_token'
export const USER_KEY = 'koli_marchand_user'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

/* ── En-tête d'authentification ──────────────────────────── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ── Refresh silencieux — un seul appel en vol à la fois ─── */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthResponse>(`${BASE}/api/auth/refresh`, { refreshToken }, { withCredentials: true })
      .then((res) => res.data.accessToken)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function clearSessionAndRedirect() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  if (window.location.pathname !== '/connexion') {
    window.location.href = '/connexion'
  }
}

/* ── 401 → tente un refresh une fois, sinon déconnexion ──── */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const isAuthCall = typeof original?.url === 'string' && original.url.includes('/api/auth/')

    if (err.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      clearSessionAndRedirect()
    }

    if (err.response?.status === 401 && isAuthCall) {
      clearSessionAndRedirect()
    }

    return Promise.reject(err)
  },
)
