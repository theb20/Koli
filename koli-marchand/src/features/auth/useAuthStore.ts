import { create } from 'zustand'
import { api, ACCESS_TOKEN_KEY, USER_KEY } from '@/lib/api'
import { getRecaptchaToken } from '@/lib/recaptcha'
import type { MerchantUser } from '@/types'

// Login résultat : soit une session complète, soit un tempToken si le
// compte a la 2FA activée (backend/'s completeAuthentication() gate,
// partagée par tous les points d'entrée — mot de passe, magic-link,
// Google — cf. koili) — /verifier-2fa doit alors échanger ce tempToken
// contre de vrais tokens via verifyTwoFactor().
export type LoginResult = { requires2FA: true; tempToken: string } | { requires2FA: false; ok: boolean }

interface AuthState {
  user: MerchantUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyTwoFactor: (tempToken: string, code: string) => Promise<boolean>
  logout: () => void
}

function readStoredUser(): MerchantUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as MerchantUser) : null
  } catch {
    return null
  }
}

type BackendUser = { id: string; prenom: string; nom: string; email: string; role: string }
type BackendStore = { id: number; name: string; description: string | null; logo: string | null; isApproved: boolean } | null

function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!readStoredUser(),

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const recaptchaToken = await getRecaptchaToken('login')
      const { data } = await api.post<{ data: { user?: BackendUser; accessToken?: string; requires2FA?: boolean; tempToken?: string } }>(
        '/api/auth/login',
        { email, password, recaptchaToken },
      )

      if (data.data.requires2FA) {
        set({ loading: false })
        return { requires2FA: true, tempToken: data.data.tempToken! }
      }

      const { user: backendUser, accessToken } = data.data as { user: BackendUser; accessToken: string }

      if (backendUser.role !== 'seller') {
        set({ error: 'Ce compte n\'est pas un compte marchand.', loading: false })
        return { requires2FA: false, ok: false }
      }

      await finalizeSession(backendUser, accessToken, set)
      return { requires2FA: false, ok: true }
    } catch (err: unknown) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      set({ error: extractErrorMessage(err, 'E-mail ou mot de passe incorrect.'), loading: false })
      return { requires2FA: false, ok: false }
    }
  },

  verifyTwoFactor: async (tempToken, code) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post<{ data: { user: BackendUser; accessToken: string } }>('/api/auth/2fa/login-verify', { tempToken, code })
      const { user: backendUser, accessToken } = data.data

      if (backendUser.role !== 'seller') {
        set({ error: 'Ce compte n\'est pas un compte marchand.', loading: false })
        return false
      }

      await finalizeSession(backendUser, accessToken, set)
      return true
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Code invalide.'), loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    api.post('/api/auth/logout').catch(() => {})
    set({ user: null, isAuthenticated: false })
  },
}))

async function finalizeSession(
  backendUser: BackendUser,
  accessToken: string,
  set: (partial: Partial<AuthState>) => void,
): Promise<void> {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

  // Le token doit être en place avant cet appel (intercepteur lib/api.ts)
  const meRes = await api.get<{ data: { store: BackendStore } }>('/api/seller/me')
  const store = meRes.data.data.store

  const merchantUser: MerchantUser = {
    id: backendUser.id,
    shopName: store?.name ?? backendUser.prenom,
    ownerName: `${backendUser.prenom} ${backendUser.nom}`.trim(),
    email: backendUser.email,
    isVerified: store?.isApproved ?? false,
  }
  localStorage.setItem(USER_KEY, JSON.stringify(merchantUser))
  set({ user: merchantUser, isAuthenticated: true, loading: false })
}
