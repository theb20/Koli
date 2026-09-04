import { create } from 'zustand'
import { api, API_BASE } from '../lib/api'
import type { Notification } from '../types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  connected: boolean
  fetchInitial: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  connectStream: () => void
  disconnectStream: () => void
}

let eventSource: EventSource | null = null

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  connected: false,

  async fetchInitial() {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
      set({ notifications: res.notifications, unreadCount: res.unreadCount })
    } catch {
      // silencieux : la cloche reste simplement vide si l'utilisateur n'est pas encore authentifié
    }
  },

  async markRead(id) {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id)?.isRead ? 0 : 1)),
    }))
    await api.post(`/api/notifications/${id}/read`)
  },

  async markAllRead() {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }))
    await api.post('/api/notifications/read-all')
  },

  connectStream() {
    if (eventSource) return
    eventSource = new EventSource(`${API_BASE}/api/notifications/stream`, { withCredentials: true })
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data) as Notification
      set((s) => ({ notifications: [notification, ...s.notifications].slice(0, 30), unreadCount: s.unreadCount + 1 }))
    }
    eventSource.onerror = () => {
      set({ connected: false })
    }
    eventSource.onopen = () => set({ connected: true })
  },

  disconnectStream() {
    eventSource?.close()
    eventSource = null
    set({ connected: false })
  },
}))

// Réexport pratique pour les composants qui veulent juste déclencher un fetch initial + stream
export function initNotifications() {
  useNotificationsStore.getState().fetchInitial()
  useNotificationsStore.getState().connectStream()
}
