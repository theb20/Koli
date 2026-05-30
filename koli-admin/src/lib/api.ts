import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

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

/* ── Redirige vers /login si 401 ─────────────────────────── */
api.interceptors.response.use(
  (res) => res,
  (err) => {
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
  Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
