import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function MerchantLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/connexion" replace />

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <Sidebar />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
