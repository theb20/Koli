import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'

export function AdminLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-6 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
