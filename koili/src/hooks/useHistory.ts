import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../lib/api'

const LOCAL_KEY = 'koli_history'
const MAX_LOCAL = 20

export function useHistory() {
  const { token } = useAuth()

  const track = useCallback((productId: number) => {
    // local
    const raw = localStorage.getItem(LOCAL_KEY)
    const ids: number[] = raw ? JSON.parse(raw) : []
    const updated = [productId, ...ids.filter(id => id !== productId)].slice(0, MAX_LOCAL)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))

    // remote (fire-and-forget)
    if (token) {
      fetch(`${API_BASE}/api/history`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ productId }),
      }).catch(() => {})
    }
  }, [token])

  const getLocalIds = useCallback((): number[] => {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(LOCAL_KEY)
  }, [])

  return { track, getLocalIds, clear }
}
