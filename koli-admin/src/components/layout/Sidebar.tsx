import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, ShoppingCart, Users, BookOpen,
  Tag, Star, MessageSquare, Settings, LogOut,
  Bell, BarChart2, Store, Layers, Percent, Zap, PackageSearch, Send
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'

const nav = [
  { to: '/',         label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/products',   label: 'Produits',       icon: Package },
  { to: '/deals',      label: 'Deals du jour',  icon: Zap },
  { to: '/categories', label: 'Catégories',    icon: Layers },
  { to: '/stores',     label: 'Magasins',      icon: Store },
  { to: '/orders',   label: 'Commandes',      icon: ShoppingCart },
  { to: '/product-requests', label: 'Demandes de sourcing', icon: PackageSearch },
  { to: '/users',    label: 'Utilisateurs',   icon: Users },
  { to: '/blog',     label: 'Blog',           icon: BookOpen },
  { to: '/promo',    label: 'Codes promo',    icon: Tag },
  { to: '/tax',      label: 'TVA & Taxes',    icon: Percent },
  { to: '/reviews',  label: 'Avis',           icon: Star },
  { to: '/contact',  label: 'Messages',       icon: MessageSquare },
  { to: '/stats',    label: 'Statistiques',   icon: BarChart2 },
  { to: '/dev/emails', label: 'Prévisualiser les emails', icon: Send }, // TEMPORAIRE
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn:  async () => { const { data } = await api.get('/api/notifications?limit=1'); return data.data.unreadCount as number },
    refetchInterval: 30_000,
  })

  const { data: newRequestsCount = 0 } = useQuery({
    queryKey: ['product-requests-new-count'],
    queryFn:  async () => { const { data } = await api.get('/api/product-requests/admin/all?status=new&limit=1'); return data.data.pagination.total as number },
    refetchInterval: 30_000,
  })

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl  flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              <img src="/imgs_dropship/favicon-skignas.png" alt="logo Skignas" />
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Skignas</p>
            <p className="text-[10px] text-slate-400">Backoffice v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Menu principal</p>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-item text-slate-500 ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {to === '/product-requests' && newRequestsCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {newRequestsCount > 99 ? '99+' : newRequestsCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Compte</p>
          <NavLink to="/settings" className={({ isActive }) => `sidebar-item text-slate-500 ${isActive ? 'active' : ''}`}>
            <Settings size={16} />
            <span>Paramètres</span>
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `sidebar-item text-slate-500 ${isActive ? 'active' : ''}`}>
            <Bell size={16} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} title="Déconnexion"
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// Mini breadcrumb component
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
