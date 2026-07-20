import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { setAuthRefreshHandlers } from '../lib/api'

/* ─── Types ──────────────────────────────────────────────────── */
export type AuthUser = {
  id: string
  prenom: string
  nom: string
  email: string
  avatar?: string
  role: 'customer' | 'admin'
  naissance?: string
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  loginWithGoogle: () => Promise<{ needsBirthdate: boolean }>
  loginWithMagicToken: (token: string) => Promise<{ needsBirthdate: boolean }>
  completeBirthdate: (naissance: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<AuthUser>) => void
}

type RegisterData = {
  prenom: string
  nom: string
  email: string
  password: string
  telephone?: string
  naissance: string
}

/* ─── API helper ─────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
  return data
}

/* ─── Context ────────────────────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'koli_token'
const USER_KEY  = 'koli_user'

/* ─── Provider ───────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
  })
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user))
    else       localStorage.removeItem(USER_KEY)
  }, [user])

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else       localStorage.removeItem(TOKEN_KEY)
  }, [token])

  // Branche le refresh silencieux d'apiFetch sur cet état — un 401 avec
  // token expiré déclenche /api/auth/refresh (cookie httpOnly), et si ça
  // échoue vraiment (session révoquée), on déconnecte proprement.
  useEffect(() => {
    setAuthRefreshHandlers({
      onTokenRefreshed: (newToken) => setToken(newToken),
      onSessionExpired: () => { setUser(null); setToken(null) },
    })
  }, [])

  /* ── Connexion email / mot de passe ─────────────────────── */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { data } = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      setToken(data.accessToken)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Inscription ─────────────────────────────────────────── */
  const register = useCallback(async (body: RegisterData) => {
    setIsLoading(true)
    try {
      const { data } = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setUser(data.user)
      setToken(data.accessToken)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Google popup ────────────────────────────────────────── */
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user

      const parts  = (fbUser.displayName ?? '').split(' ')
      const prenom = parts[0] ?? 'Utilisateur'
      const nom    = parts.slice(1).join(' ') || 'Koli'

      const { data } = await apiFetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          email:       fbUser.email,
          prenom,
          nom,
          avatar:      fbUser.photoURL,
          firebaseUid: fbUser.uid,
        }),
      })

      setUser(data.user)
      setToken(data.accessToken)
      // navigation gérée par la page appelante (navigate('/profil'))
      return { needsBirthdate: !!data.needsBirthdate }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // popup fermée volontairement → pas d'erreur à afficher
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setAuthError(msg)
      }
      throw err   // re-throw pour que la page puisse aussi catch
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Magic link ─────────────────────────────────────────── */
  const loginWithMagicToken = useCallback(async (magicToken: string) => {
    setIsLoading(true)
    try {
      const { data } = await apiFetch('/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: magicToken }),
      })
      setUser(data.user)
      setToken(data.accessToken)
      return { needsBirthdate: !!data.needsBirthdate }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Déconnexion ─────────────────────────────────────────── */
  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    if (token) {
      fetch(`${API}/api/auth/logout`, {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    auth.signOut().catch(() => {})
  }, [token])

  /* ── Mise à jour locale ──────────────────────────────────── */
  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  /* ── Compléter la date de naissance (comptes Google, requis 18+) ── */
  const completeBirthdate = useCallback(async (naissance: string) => {
    if (!token) throw new Error('Non connecté')
    const { data } = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ naissance }),
    })
    setUser(prev => prev ? { ...prev, naissance: data.naissance } : null)
  }, [token])

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authError,
      isAuthenticated: !!user,
      login, register, loginWithGoogle, loginWithMagicToken, completeBirthdate, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/* ─── Hook ───────────────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
