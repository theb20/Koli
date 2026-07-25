import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck, Menu, Search, Package, ShoppingCart, Users, Loader2 } from 'lucide-react'
import { useUiStore } from '@/store/useUiStore'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { fmtDateTime, fmtFcfa } from '@/lib/format'
import { orderStatusMap } from '@/lib/statusMaps'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/api/useNotifications'
import { useDebouncedValue, useGlobalSearch } from '@/features/search/api/useGlobalSearch'

export function Topbar() {
  const { openMobileSidebar, notificationsOpen, toggleNotifications, closeNotifications } = useUiStore()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchBoxRef = useRef<HTMLFormElement>(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data: searchData, isFetching: searchLoading } = useGlobalSearch(debouncedSearch)
  const searchOpen = searchFocused && search.trim().length >= 2
  const hasResults = !!searchData && (searchData.products.length + searchData.orders.length + searchData.customers.length) > 0

  const { data: notifData } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const notifications = notifData?.notifications ?? []
  const unreadCount = notifData?.unreadCount ?? 0

  const openNotification = (n: { id: string; isRead: boolean; link: string | null }) => {
    if (!n.isRead) markRead.mutate(n.id)
    closeNotifications()
    if (n.link) navigate(n.link)
  }

  const initials = (user?.shopName ?? 'MB')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const closeSearch = () => {
    setSearchFocused(false)
    searchBoxRef.current?.querySelector('input')?.blur()
  }

  const goToSearch = (path: string) => {
    setSearch('')
    closeSearch()
    navigate(path)
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) goToSearch(`/produits?search=${encodeURIComponent(search.trim())}`)
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

      <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-md" ref={searchBoxRef}>
        <label htmlFor="global-search" className="sr-only">Rechercher</label>
        <div className="relative">
          {searchLoading ? (
            <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a1] animate-spin" />
          ) : (
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a1]" />
          )}
          <input
            id="global-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Rechercher un produit, une commande, un client..."
            autoComplete="off"
            className="w-full rounded-xl border border-[#e8e8e4] bg-[#f5f5f3] pl-9 pr-3 py-2 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
          />
        </div>

        {searchOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={closeSearch} aria-hidden="true" />
            <div className="absolute left-0 right-0 mt-2 bg-white border border-[#e8e8e4] rounded-2xl py-2 z-20 max-h-[28rem] overflow-y-auto shadow-lg">
              {!searchData ? (
                <p className="px-4 py-6 text-sm text-[#a3a3a1] text-center">Recherche…</p>
              ) : !hasResults ? (
                <p className="px-4 py-6 text-sm text-[#a3a3a1] text-center">Aucun résultat pour "{search}"</p>
              ) : (
                <>
                  {searchData.products.length > 0 && (
                    <div>
                      <p className="px-4 pt-1 pb-1.5 text-[11px] font-semibold text-[#a3a3a1] uppercase tracking-wider flex items-center gap-1.5">
                        <Package size={11} /> Produits
                      </p>
                      {searchData.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => goToSearch(`/produits?search=${encodeURIComponent(p.name)}`)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f5f3] transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#f5f5f3] overflow-hidden shrink-0">
                            {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="text-sm text-[#0a0a0b] truncate flex-1">{p.name}</span>
                          <span className="text-xs text-[#6b6b68] shrink-0">{fmtFcfa(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchData.orders.length > 0 && (
                    <div>
                      <p className="px-4 pt-2 pb-1.5 text-[11px] font-semibold text-[#a3a3a1] uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingCart size={11} /> Commandes
                      </p>
                      {searchData.orders.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => goToSearch(`/commandes?search=${encodeURIComponent(o.orderNumber)}`)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f5f3] transition-colors text-left"
                        >
                          <span className="text-sm font-medium text-[#0a0a0b] shrink-0">{o.orderNumber}</span>
                          <span className="text-xs text-[#6b6b68] truncate flex-1">{o.client} · {orderStatusMap[o.status as keyof typeof orderStatusMap]?.label ?? o.status}</span>
                          <span className="text-xs text-[#6b6b68] shrink-0">{fmtFcfa(o.total)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchData.customers.length > 0 && (
                    <div>
                      <p className="px-4 pt-2 pb-1.5 text-[11px] font-semibold text-[#a3a3a1] uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={11} /> Clients
                      </p>
                      {searchData.customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => goToSearch(`/clients/${encodeURIComponent(c.id)}`)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f5f3] transition-colors text-left"
                        >
                          <span className="text-sm text-[#0a0a0b] truncate">{c.name}</span>
                          <span className="text-xs text-[#a3a3a1] truncate flex-1">{c.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
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
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1E90FF]" aria-hidden="true" />
            )}
          </button>
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={closeNotifications} aria-hidden="true" />
              <div
                role="menu"
                className="absolute right-0 mt-2 w-80 bg-white border border-[#e8e8e4] rounded-2xl py-2 z-20 max-h-96 overflow-y-auto"
              >
                <div className="flex items-center justify-between px-4 py-2">
                  <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs font-medium text-[#1E90FF] hover:underline"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#a3a3a1] text-center">Aucune notification</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-[#f5f5f3] transition-colors ${!n.isRead ? 'bg-[#1E90FF]/5' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1E90FF] shrink-0" aria-hidden="true" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0a0a0b]">{n.title}</p>
                          <p className="text-sm text-[#6b6b68]">{n.body}</p>
                          <p className="text-xs text-[#a3a3a1] mt-0.5">{fmtDateTime(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
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
