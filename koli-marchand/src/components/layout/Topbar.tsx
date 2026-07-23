import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck, Menu, Search } from 'lucide-react'
import { useUiStore } from '@/store/useUiStore'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { fmtDateTime } from '@/lib/format'

const NOTIFICATIONS = [
  { id: 1, text: 'Nouvelle commande reçue — SKG-10042', date: new Date().toISOString() },
  { id: 2, text: 'Versement de 148 500 FCFA effectué sur Wave', date: new Date(Date.now() - 86_400_000).toISOString() },
  { id: 3, text: 'Stock faible : Écouteurs sans fil Pro X (3 restants)', date: new Date(Date.now() - 2 * 86_400_000).toISOString() },
]

export function Topbar() {
  const { openMobileSidebar, notificationsOpen, toggleNotifications, closeNotifications } = useUiStore()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const initials = (user?.shopName ?? 'MB')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/produits?search=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 sm:px-6 bg-white border-b border-[#e8e8e4]">
      <button
        onClick={openMobileSidebar}
        aria-label="Ouvrir le menu"
        className="lg:hidden p-2 -ml-2 rounded-lg text-[#0a0a0b] hover:bg-[#f0f0ed] transition-colors"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={onSearchSubmit} className="flex-1 max-w-md">
        <label htmlFor="global-search" className="sr-only">Rechercher</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a1]" />
          <input
            id="global-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit, une commande..."
            className="w-full rounded-xl border border-[#e8e8e4] bg-[#f5f5f3] pl-9 pr-3 py-2 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button
            onClick={toggleNotifications}
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notificationsOpen}
            className="relative p-2 rounded-lg text-[#0a0a0b] hover:bg-[#f0f0ed] transition-colors"
          >
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1E90FF]" aria-hidden="true" />
          </button>
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={closeNotifications} aria-hidden="true" />
              <div
                role="menu"
                className="absolute right-0 mt-2 w-80 bg-white border border-[#e8e8e4] rounded-2xl py-2 z-20"
              >
                <p className="px-4 py-2 text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">
                  Notifications
                </p>
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="px-4 py-2.5 hover:bg-[#f5f5f3] transition-colors">
                    <p className="text-sm text-[#0a0a0b]">{n.text}</p>
                    <p className="text-xs text-[#a3a3a1] mt-0.5">{fmtDateTime(n.date)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 pl-2 sm:pl-4 sm:border-l border-[#e8e8e4]">
          <div className="w-9 h-9 rounded-full bg-[#0a0a0b] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold text-[#0a0a0b] truncate">{user?.shopName ?? 'Ma Boutique'}</p>
            <p className="text-xs text-[#6b6b68] flex items-center gap-1">
              <BadgeCheck size={12} className="text-[#1E90FF]" />
              Marchand vérifié
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
