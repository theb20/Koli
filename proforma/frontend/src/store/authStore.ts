import { create } from 'zustand'
import { api } from '../lib/api'
import { useNotificationsStore } from './notificationsStore'
import type { Company, User } from '../types'

interface AuthState {
  user: User | null
  companies: Company[]
  activeCompanyId: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  setActiveCompany: (id: string) => void
  addCompany: (company: Company) => void
  updateCompany: (company: Company) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  companies: [],
  activeCompanyId: localStorage.getItem('proforma_active_company'),
  status: 'idle',

  async login(email, password) {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password })
    localStorage.setItem('proforma_token', res.token)
    await get().fetchMe()
  },

  async register(data) {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', data)
    localStorage.setItem('proforma_token', res.token)
    await get().fetchMe()
  },

  logout() {
    localStorage.removeItem('proforma_token')
    localStorage.removeItem('proforma_active_company')
    useNotificationsStore.getState().disconnectStream()
    set({ user: null, companies: [], activeCompanyId: null, status: 'idle' })
  },

  async fetchMe() {
    set({ status: 'loading' })
    try {
      const res = await api.get<{ user: User; companies: Company[] }>('/api/auth/me')
      const stored = localStorage.getItem('proforma_active_company')
      const activeCompanyId = stored && res.companies.some((c) => c.id === stored) ? stored : res.companies[0]?.id || null
      if (activeCompanyId) localStorage.setItem('proforma_active_company', activeCompanyId)
      set({ user: res.user, companies: res.companies, activeCompanyId, status: 'ready' })
    } catch {
      localStorage.removeItem('proforma_token')
      set({ user: null, companies: [], status: 'error' })
    }
  },

  setActiveCompany(id) {
    localStorage.setItem('proforma_active_company', id)
    set({ activeCompanyId: id })
  },

  addCompany(company) {
    set((s) => ({ companies: [...s.companies, company] }))
    get().setActiveCompany(company.id)
  },

  updateCompany(company) {
    set((s) => ({ companies: s.companies.map((c) => (c.id === company.id ? company : c)) }))
  },
}))
