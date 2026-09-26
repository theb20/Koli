import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { Search, Plus, Moon, Sun, Package, ShoppingCart, User, Keyboard, Loader2, CornerDownLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { NAV_ITEMS } from '../../lib/navigation'
import { formatFCFA } from '../../lib/format'
import { useTheme } from '../../lib/theme'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Order, Product, User as UserT } from '../../types'
import { Kbd } from '../ui/Button'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Results = { products: Product[]; orders: Order[]; users: UserT[] }

/** Recherche distante (produits, commandes, clients) via les endpoints existants. */
function useRemoteSearch(query: string) {
  const q = useDebouncedValue(query.trim(), 250)
  return useQuery({
    queryKey: ['palette-search', q],
    enabled: q.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<Results> => {
      const enc = encodeURIComponent(q)
      const [p, o, u] = await Promise.allSettled([
        api.get(`/api/products?q=${enc}&limit=5`),
        api.get(`/api/orders/admin/all?q=${enc}&limit=5`),
        api.get(`/api/auth/users?q=${enc}&limit=5`),
      ])
      return {
        products: p.status === 'fulfilled' ? p.value.data.data.products ?? [] : [],
        orders:   o.status === 'fulfilled' ? o.value.data.data.orders ?? [] : [],
        users:    u.status === 'fulfilled' ? u.value.data.data.users ?? [] : [],
      }
    },
  })
}

function Item({ onSelect, icon, children, hint }: { onSelect: () => void; icon: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <Command.Item onSelect={onSelect}
      className="flex items-center gap-3 h-10 px-3 rounded-nav text-body text-ink cursor-pointer data-[selected=true]:bg-hover-fill">
      <span className="text-muted shrink-0">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-caption text-muted shrink-0">{hint}</span>}
    </Command.Item>
  )
}

const Group = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <Command.Group heading={heading}
    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted">
    {children}
  </Command.Group>
)

export function CommandPalette({ open, onOpenChange, onShortcuts }: {
  open: boolean; onOpenChange: (o: boolean) => void; onShortcuts: () => void
}) {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const [query, setQuery] = useState('')
  const { data, isFetching } = useRemoteSearch(query)

  const run = (fn: () => void) => { onOpenChange(false); setQuery(''); fn() }
  const go = (to: string) => run(() => navigate(to))

  const nq = norm(query.trim())
  const match = (...texts: (string | undefined)[]) => !nq || texts.some(t => t && norm(t).includes(nq))

  const pages = NAV_ITEMS.filter(i => match(i.label, i.keywords))
  const actions = [
    { label: 'Créer un produit',     icon: <Plus size={16} />, run: () => navigate('/products/new') },
    { label: 'Nouveau code promo',    icon: <Plus size={16} />, run: () => navigate('/promo') },
    { label: 'Nouvel article de blog', icon: <Plus size={16} />, run: () => navigate('/blog/new') },
    { label: isDark ? 'Passer en thème clair' : 'Passer en thème sombre', icon: isDark ? <Sun size={16} /> : <Moon size={16} />, run: toggle },
    { label: 'Raccourcis clavier',   icon: <Keyboard size={16} />, run: onShortcuts },
  ].filter(a => match(a.label))

  const hasRemote = !!data && (data.products.length + data.orders.length + data.users.length) > 0

  return (
    <Command.Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setQuery('') }}
      label="Palette de commandes" shouldFilter={false}
      overlayClassName="fixed inset-0 z-[60] bg-overlay"
      contentClassName="fixed z-[61] left-1/2 top-[12vh] -translate-x-1/2 w-[min(640px,calc(100vw-32px))] rounded-card border border-line bg-card shadow-popover overflow-hidden">
      <div className="flex items-center gap-3 h-14 px-4 border-b border-line">
        {isFetching ? <Loader2 size={18} className="animate-spin text-muted" /> : <Search size={18} className="text-muted" />}
        <Command.Input value={query} onValueChange={setQuery} autoFocus
          placeholder="Rechercher une page, un produit, une commande, un client…"
          className="flex-1 h-full bg-transparent text-body text-ink placeholder:text-muted outline-none focus-visible:outline-none" />
        <Kbd>Échap</Kbd>
      </div>
      <Command.List className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
        <Command.Empty className="py-10 text-center text-secondary text-muted">
          {query.trim().length >= 2 && isFetching ? 'Recherche…' : 'Aucun résultat'}
        </Command.Empty>

        {hasRemote && data && (
          <>
            {data.orders.length > 0 && <Group heading="Commandes">
              {data.orders.map(o => (
                <Item key={o.id} icon={<ShoppingCart size={16} />} onSelect={() => go(`/orders/${o.id}`)}
                  hint={formatFCFA(o.total)}>
                  {o.orderNumber} · {o.clientPrenom} {o.clientNom}
                </Item>
              ))}
            </Group>}
            {data.products.length > 0 && <Group heading="Produits">
              {data.products.map(p => (
                <Item key={p.id} icon={<Package size={16} />} onSelect={() => go(`/products/${p.id}`)} hint={formatFCFA(p.price)}>{p.name}</Item>
              ))}
            </Group>}
            {data.users.length > 0 && <Group heading="Clients">
              {data.users.map(u => (
                <Item key={u.id} icon={<User size={16} />} onSelect={() => go(`/users?q=${encodeURIComponent(u.email)}`)} hint={u.email}>
                  {u.prenom} {u.nom}
                </Item>
              ))}
            </Group>}
          </>
        )}

        {pages.length > 0 && <Group heading="Pages">
          {pages.map(({ to, label, icon: Icon }) => (
            <Item key={to} icon={<Icon size={16} strokeWidth={1.5} />} onSelect={() => go(to)}>{label}</Item>
          ))}
        </Group>}

        {actions.length > 0 && <Group heading="Actions">
          {actions.map(a => <Item key={a.label} icon={a.icon} onSelect={() => run(a.run)}>{a.label}</Item>)}
        </Group>}
      </Command.List>
      <div className="flex items-center gap-4 h-10 px-4 border-t border-line text-caption text-muted">
        <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
        <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft size={10} /></Kbd> ouvrir</span>
        <span className="ml-auto flex items-center gap-1.5"><Kbd>G</Kbd> puis <Kbd>O</Kbd> commandes</span>
      </div>
    </Command.Dialog>
  )
}
