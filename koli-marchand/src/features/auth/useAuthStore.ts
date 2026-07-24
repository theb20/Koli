import { create } from 'zustand'
import { api, ACCESS_TOKEN_KEY, USER_KEY } from '@/lib/api'
import type { MerchantUser } from '@/types'

interface AuthState {
  user: MerchantUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
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

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!readStoredUser(),

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post<{ data: { user: BackendUser; accessToken: string } }>('/api/auth/login', { email, password })
      const { user: backendUser, accessToken } = data.data

      if (backendUser.role !== 'seller') {
        set({ error: 'Ce compte n\'est pas un compte marchand.', loading: false })
        return false
      }

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
      return true
    } catch (err: unknown) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'E-mail ou mot de passe incorrect.'
      set({ error: message, loading: false })
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
