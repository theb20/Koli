import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  link: string | null
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  pagination: { page: number; limit: number; total: number }
}

// Poll toutes les 20s : pas de canal temps réel (WebSocket/SSE) côté backend/
// pour l'instant — un polling léger reste largement suffisant pour un badge
// de notifications marchand (pas un chat).
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => unwrap<NotificationsResponse>(await api.get('/api/notifications', { params: { limit: 20 } })),
    refetchInterval: 20_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.put(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => api.put('/api/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
