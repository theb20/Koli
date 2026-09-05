import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { setAuthRefreshHandlers } from '../lib/api'
import { getRecaptchaToken } from '../lib/recaptcha'
import { purgeAllSessionData } from '../lib/sessionPurge'

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

// Une fois le mot de passe/magic-link/Google validé, le backend peut soit
// connecter directement (needsBirthdate), soit exiger un code 2FA avant
// d'émettre de vrais tokens (requires2FA) — voir verifyTwoFactor().
export type LoginResult =
  | { requires2FA: true; tempToken: string }
  | { requires2FA?: false; needsBirthdate: boolean }

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<LoginResult>
  register: (data: RegisterData) => Promise<void>
  loginWithGoogle: (referralCode?: string) => Promise<LoginResult>
  loginWithMagicToken: (token: string) => Promise<LoginResult>
  verifyTwoFactor: (tempToken: string, code: string) => Promise<{ needsBirthdate: boolean }>
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
  referralCode?: string
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
  const queryClient = useQueryClient()

  /* Purge complète de session — appelée par logout() ET par une expiration
     silencieuse de session (refresh token invalide, voir onSessionExpired
     ci-dessous) : dans les deux cas, aucune donnée du compte précédent ne
     doit rester accessible. Synchrone et inconditionnelle, jamais derrière
     un `await` réseau — c'est ce qui garantit qu'elle s'exécute même si
     l'appel de déconnexion au backend échoue ou traîne. */
  const purgeSession = useCallback(() => {
    setUser(null)
    setToken(null)
    // Retrait synchrone en plus des effets [user]/[token] ci-dessous (qui
    // s'exécuteraient de toute façon, mais seulement après le prochain
    // rendu) — élimine tout délai, même d'une seule frame, avant qu'un
    // rechargement de page ne puisse revoir le compte précédent.
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    // Panier, comparateur, et tout futur store privé enregistré (voir
    // lib/sessionPurge.ts) — évite que AuthContext ait à connaître chaque
    // store un par un.
    purgeAllSessionData()
    // Historique de navigation local (recommandations "récemment vus") —
    // clé simple, pas de state React associé à réinitialiser.
    localStorage.removeItem('koli_history')
    // Cache React Query : plusieurs clés (ex. ['loyalty'], ['my-orders',...])
    // ne sont pas namespacées par utilisateur — sans ce clear, une
    // reconnexion avec un autre compte pourrait afficher un instant les
    // données en cache du compte précédent avant le refetch.
    queryClient.clear()
  }, [queryClient])

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
      onSessionExpired: () => purgeSession(),
    })
  }, [purgeSession])

  /* ── Connexion email / mot de passe ─────────────────────── */
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true)
    try {
      const recaptchaToken = await getRecaptchaToken('login')
      const { data } = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, recaptchaToken }),
      })
      if (data.requires2FA) return { requires2FA: true, tempToken: data.tempToken }
      setUser(data.user)
      setToken(data.accessToken)
      return { needsBirthdate: !!data.needsBirthdate }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Inscription ─────────────────────────────────────────── */
  const register = useCallback(async (body: RegisterData) => {
    setIsLoading(true)
    try {
      const recaptchaToken = await getRecaptchaToken('register')
      const { data } = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...body, recaptchaToken }),
      })
      setUser(data.user)
      setToken(data.accessToken)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Google popup ────────────────────────────────────────── */
  const loginWithGoogle = useCallback(async (referralCode?: string): Promise<LoginResult> => {
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
          referralCode: referralCode?.trim() || undefined,
        }),
      })

      if (data.requires2FA) return { requires2FA: true, tempToken: data.tempToken }
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
  const loginWithMagicToken = useCallback(async (magicToken: string): Promise<LoginResult> => {
    setIsLoading(true)
    try {
      const { data } = await apiFetch('/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: magicToken }),
      })
      if (data.requires2FA) return { requires2FA: true, tempToken: data.tempToken }
      setUser(data.user)
      setToken(data.accessToken)
      return { needsBirthdate: !!data.needsBirthdate }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Vérification du code 2FA (après login/magic-link/Google) ── */
  const verifyTwoFactor = useCallback(async (tempToken: string, code: string) => {
    setIsLoading(true)
    try {
      const { data } = await apiFetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code }),
      })
      setUser(data.user)
      setToken(data.accessToken)
      return { needsBirthdate: !!data.needsBirthdate }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── Déconnexion ─────────────────────────────────────────────
     La révocation backend (supprime la session, invalide le refresh
     token — voir POST /api/auth/logout) part en fire-and-forget : la purge
     locale ci-dessous s'exécute immédiatement, sans attendre la réponse
     réseau. C'est volontaire — si on attendait cet appel (même dans un
     try/finally), un réseau lent laisserait les données du compte
     affichées plus longtemps que nécessaire, et un échec réseau ne doit de
     toute façon jamais empêcher la purge locale. */
  const logout = useCallback(() => {
    if (token) {
      fetch(`${API}/api/auth/logout`, {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    auth.signOut().catch(() => {})
    purgeSession()
  }, [token, purgeSession])

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
      login, register, loginWithGoogle, loginWithMagicToken, verifyTwoFactor, completeBirthdate, logout, updateUser,
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
