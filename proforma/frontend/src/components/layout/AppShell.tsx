import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuthStore } from '../../store/authStore'
import { initNotifications, useNotificationsStore } from '../../store/notificationsStore'
import { Loader2 } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { Building2 } from '../ui/Icon'
import { useState } from 'react'
import { CompanyFormModal } from '../company/CompanyFormModal'
import { Button } from '../ui/Button'

export function AppShell() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const companies = useAuthStore((s) => s.companies)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (user) {
      initNotifications()
      return () => useNotificationsStore.getState().disconnectStream()
    }
  }, [user])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    )
  }

  if (!user) return <Navigate to="/connexion" replace />

  if (companies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-base p-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<Building2 size={22} />}
            title="Créez votre première entreprise"
            description="Renseignez les informations de votre entreprise pour commencer à émettre des factures proforma."
            action={<Button onClick={() => setCreateOpen(true)}>Créer mon entreprise</Button>}
          />
        </div>
        <CompanyFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
