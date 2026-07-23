import { create } from 'zustand'
import { api, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/lib/api'
import type { AuthResponse, MerchantUser } from '@/types'

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

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!readStoredUser(),

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password })
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      set({ user: data.user, isAuthenticated: true, loading: false })
      return true
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'E-mail ou mot de passe incorrect.'
      set({ error: message, loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    api.post('/api/auth/logout').catch(() => {})
    set({ user: null, isAuthenticated: false })
  },
}))
