import { create } from 'zustand'

interface UiState {
  /** Tiroir de la sidebar en mobile/tablette */
  mobileSidebarOpen: boolean
  openMobileSidebar: () => void
  closeMobileSidebar: () => void

  /** Repli de la sidebar en desktop (icônes seules) */
  sidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void

  /** Panneau de notifications (topbar) */
  notificationsOpen: boolean
  toggleNotifications: () => void
  closeNotifications: () => void

  /** Libellé de la vue active, affiché dans le fil d'ariane de la topbar */
  activeViewLabel: string
  setActiveViewLabel: (label: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  mobileSidebarOpen: false,
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  notificationsOpen: false,
  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
  closeNotifications: () => set({ notificationsOpen: false }),

  activeViewLabel: 'Tableau de bord',
  setActiveViewLabel: (label) => set({ activeViewLabel: label }),
}))
