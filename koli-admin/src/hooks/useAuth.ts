import { useState, useCallback } from 'react'
import { api } from '../lib/api'
import type { AdminUser } from '../types'

const TOKEN_KEY = 'koli_admin_token'
const USER_KEY  = 'koli_admin_user'

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      if (data.data.user.role !== 'admin') {
        setError('Accès réservé aux administrateurs.')
        return false
      }
      localStorage.setItem(TOKEN_KEY, data.data.accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user))
      setToken(data.data.accessToken)
      setUser(data.data.user)
      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg || 'Email ou mot de passe incorrect.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken(null)
    api.post('/api/auth/logout').catch(() => {})
  }, [])

  return { user, token, loading, error, login, logout, isAuthenticated: !!user && user.role === 'admin' }
}
