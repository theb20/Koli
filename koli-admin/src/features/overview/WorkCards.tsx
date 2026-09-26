import { Link } from 'react-router-dom'
import { Clock, Truck, RotateCcw, Briefcase, PackageSearch, MessageSquare, ChevronRight, Package, Store, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/ui/States'
import { Sparkline } from '../../components/charts/Sparkline'
import { cn } from '../../lib/cn'
import { formatFCFA, formatNumber } from '../../lib/format'
import type { Insights } from './api'

type CardProps = { data?: Insights; isLoading: boolean; isError: boolean; onRetry: () => void; className?: string }

/* ── À traiter ─────────────────────────────────────────────── */
export function TodoCard({ data, isLoading, isError, onRetry, className, applications }: CardProps & { applications?: number }) {
  if (isLoading) return <CardSkeleton lines={5} className={className} />
  if (isError || !data) return <Card padded className={className}><ErrorState onRetry={onRetry} /></Card>
  const t = data.todo
  const rows = [
    { to: '/orders',                label: 'Commandes à confirmer',                  count: t.pendingOrders,      icon: Clock },
    { to: '/orders',                label: `En retard d'expédition (+${t.lateDays} j)`, count: t.lateOrders,     icon: Truck, urgent: true },
    { to: '/returns',               label: 'Retours à traiter',                      count: t.requestedReturns,   icon: RotateCcw },
    { to: '/merchant-applications', label: 'Candidatures marchands',                 count: applications,         icon: Briefcase },
    { to: '/product-requests',      label: 'Demandes de produits',                   count: t.newProductRequests, icon: PackageSearch },
    { to: '/contact',               label: 'Messages de contact',                    count: t.unreadContacts,     icon: MessageSquare },
  ].filter(r => r.count !== undefined) as { to: string; label: string; count: number; icon: typeof Clock; urgent?: boolean }[]
  const total = rows.reduce((s, r) => s + r.count, 0)

  return (
    <Card padded className={className}>
      <CardHeader title="À traiter" subtitle={total ? `${formatNumber(total)} élément${total > 1 ? 's' : ''} en attente` : 'Tout est à jour'} />
      {total === 0
        ? <EmptyState icon={<CheckCircle2 size={22} />} title="Rien à traiter" text="Aucune commande, aucun retour ni message en attente." className="py-8" />
        : (
          <ul className="mt-4 -mx-2">
            {rows.map(({ to, label, count, icon: Icon, urgent }) => (
              <li key={label}>
                <Link to={to} className={cn('flex items-center gap-3 h-11 px-2 rounded-nav hover:bg-hover-fill transition-colors', count === 0 && 'opacity-60')}>
                  <span className="w-8 h-8 rounded-input bg-muted-fill text-ink-2 flex items-center justify-center shrink-0"><Icon size={16} strokeWidth={1.5} /></span>
                  <span className="flex-1 text-body text-ink-2 truncate">{label}</span>
                  <span className={cn('min-w-6 h-6 px-2 rounded-full text-caption font-medium flex items-center justify-center tabular',
                    count === 0 ? 'bg-muted-fill text-muted' : urgent ? 'bg-down-bg text-down' : 'bg-primary text-on-primary')}>
                    {count}
                  </span>
                  <ChevronRight size={16} className="text-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Card>
  )
}

/* ── Top 5 produits (30 jours) ─────────────────────────────── */
export function TopProductsCard({ data, isLoading, isError, onRetry, className }: CardProps) {
  if (isLoading) return <CardSkeleton lines={5} className={className} />
  if (isError || !data) return <Card padded className={className}><ErrorState onRetry={onRetry} /></Card>
  return (
    <Card padded className={className}>
      <CardHeader title="Top produits" subtitle="Chiffre d'affaires sur 30 jours" />
      {data.topProducts.length === 0
        ? <EmptyState icon={<Package size={22} />} title="Aucune vente payée sur 30 jours" className="py-8" />
        : (
          <ol className="mt-4 space-y-1 -mx-2">
            {data.topProducts.map((p, i) => (
              <li key={p.id}>
                <Link to={`/products/${p.id}`} className="flex items-center gap-3 px-2 py-2 rounded-nav hover:bg-hover-fill transition-colors">
                  <span className="w-4 text-caption text-muted tabular">{i + 1}</span>
                  <span className="w-10 h-10 rounded-nav bg-muted-fill overflow-hidden shrink-0">
                    {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-secondary font-medium text-ink truncate">{p.name}</span>
                    <span className="block text-caption text-muted tabular">{formatNumber(p.qty)} vendu{p.qty > 1 ? 's' : ''}</span>
                  </span>
                  <Sparkline values={p.trend} className="hidden sm:block shrink-0" />
                  <span className="w-28 text-right text-secondary font-medium text-ink tabular shrink-0">{formatFCFA(p.revenue)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      <p className="sr-only">Les courbes montrent les ventes hebdomadaires des 6 dernières semaines.</p>
    </Card>
  )
}

/* ── Top 5 boutiques (30 jours) ───────────────────────────── */
export function TopStoresCard({ data, isLoading, isError, onRetry, className }: CardProps) {
  if (isLoading) return <CardSkeleton lines={5} className={className} />
  if (isError || !data) return <Card padded className={className}><ErrorState onRetry={onRetry} /></Card>
  const max = Math.max(1, ...data.topStores.map(s => s.revenue))
  return (
    <Card padded className={className}>
      <CardHeader title="Top boutiques" subtitle="Ventes marchandes sur 30 jours" />
      {data.topStores.length === 0
        ? <EmptyState icon={<Store size={22} />} title="Aucune vente marchande sur 30 jours" className="py-8" />
        : (
          <ol className="mt-4 space-y-3">
            {data.topStores.map(s => (
              <li key={s.id}>
                <Link to={`/stores/${s.id}`} className="block group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-muted-fill overflow-hidden shrink-0">
                      {s.logo && <img src={s.logo} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </span>
                    <span className="flex-1 min-w-0 text-secondary font-medium text-ink truncate group-hover:underline">{s.name}</span>
                    <span className="text-caption text-muted tabular">{formatNumber(s.orders)} cmd</span>
                    <span className="w-28 text-right text-secondary font-medium text-ink tabular">{formatFCFA(s.revenue)}</span>
                  </div>
                  <div className="mt-2 ml-11 h-1.5 rounded-full bg-muted-fill overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.revenue / max) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
    </Card>
  )
}
