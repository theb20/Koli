import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart2,
  Settings, LifeBuoy, LogOut, X,
} from 'lucide-react'
import { useUiStore } from '@/store/useUiStore'
import { useAuthStore } from '@/features/auth/useAuthStore'

// Paiements et Promotions retirés du menu : pas encore branchés sur un vrai
// backend (le premier suppose un système de wallet à concevoir séparément,
// le second une évolution de schéma pour scoper les codes promo par
// boutique) — cf. discussion de périmètre. Les pages/routes existent
// toujours, juste inaccessibles depuis la navigation pour l'instant.
const nav = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/produits', label: 'Produits', icon: Package },
  { to: '/commandes', label: 'Commandes', icon: ShoppingCart },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/statistiques', label: 'Statistiques', icon: BarChart2 },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUiStore()
  const logout = useAuthStore((s) => s.logout)

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-[#0a0a0b] flex flex-col z-50
          transition-transform duration-200 ease-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Navigation principale"
      >
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src="/logo/favicon-96x96.png" alt="" className="w-8 h-8 rounded-lg" />
            <div>
              <p className="text-sm font-extrabold text-white tracking-tight">Skignas</p>
              <p className="text-[10px] text-[#a3a3a1]">Espace marchand</p>
            </div>
          </div>
          <button
            onClick={closeMobileSidebar}
            aria-label="Fermer le menu"
            className="lg:hidden p-1.5 rounded-lg text-[#a3a3a1] hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Menu">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobileSidebar}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <a
            href="mailto:support@skignas.com"
            className="sidebar-item"
          >
            <LifeBuoy size={17} aria-hidden="true" />
            <span>Aide &amp; support</span>
          </a>
          <button onClick={logout} className="sidebar-item w-full">
            <LogOut size={17} aria-hidden="true" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
