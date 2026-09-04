import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Receipt, Users, Package, Settings, LogOut, Repeat } from '../ui/Icon'
import { useAuthStore } from '../../store/authStore'

const LINKS = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/proformas', label: 'Mes proformas', icon: FileText },
  { to: '/factures', label: 'Factures', icon: Receipt },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/produits', label: 'Produits & services', icon: Package },
  { to: '/automatisation', label: 'Automatisation', icon: Repeat },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/logo-skignas.png" alt="Skignas" className="h-8 w-auto" />
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-ink">Proforma</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">by Skignas</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-light text-brand-dark' : 'text-ink/70 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-brand text-xs font-bold text-white">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[11px] text-muted">{user?.email}</p>
          </div>
          <button onClick={logout} title="Déconnexion" className="p-1.5 text-muted hover:bg-gray-100 hover:text-danger">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
