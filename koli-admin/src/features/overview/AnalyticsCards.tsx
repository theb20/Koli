import { Link } from 'react-router-dom'
import { CreditCard, MapPin, PackageCheck, ShoppingCart, Star, Store, RotateCcw, Activity } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/ui/States'
import { DonutChart } from '../../components/charts/DonutChart'
import { StatusPill } from '../../components/ui/Badge'
import { cn } from '../../lib/cn'
import { formatCompactFCFA, formatDate, formatFCFA, formatNumber } from '../../lib/format'
import type { Insights } from './api'

type CardProps = { data?: Insights; isLoading: boolean; isError: boolean; onRetry: () => void; className?: string }

const guard = (p: CardProps, lines = 4) =>
  p.isLoading ? <CardSkeleton lines={lines} className={p.className} />
  : p.isError || !p.data ? <Card padded className={p.className}><ErrorState onRetry={p.onRetry} /></Card>
  : null

/* ── Moyens de paiement (30 jours) ─────────────────────────── */
const METHOD: Record<string, { label: string; color: string }> = {
  online: { label: 'Paiement en ligne', color: 'var(--primary)' },
  cash:   { label: 'À la livraison',    color: 'var(--coral)' },
}

export function PaymentsCard(p: CardProps) {
  const g = guard(p); if (g) return g
  const rows = p.data!.payments.map(x => ({ ...x, ...(METHOD[x.method] ?? { label: x.method, color: 'var(--text-muted)' }) }))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return (
    <Card padded className={p.className}>
      <CardHeader title="Moyens de paiement" subtitle="Commandes payées sur 30 jours" />
      {total === 0 ? <EmptyState icon={<CreditCard size={22} />} title="Aucun paiement sur 30 jours" className="py-8" /> : (
        <div className="mt-5 flex flex-col items-center gap-5">
          <DonutChart slices={rows.map(r => ({ key: r.method, label: r.label, value: r.amount, color: r.color }))}
            center={<><span className="text-micro text-muted">Total</span><span className="text-secondary font-semibold text-ink tabular">{formatCompactFCFA(total)}</span></>} />
          <ul className="w-full space-y-3">
            {rows.map(r => (
              <li key={r.method} className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} aria-hidden />
                <span className="flex-1 min-w-0 text-secondary text-ink-2">{r.label}</span>
                <span className="text-right">
                  <span className="block text-secondary font-medium text-ink tabular">{formatFCFA(r.amount)}</span>
                  <span className="block text-caption text-muted tabular">{formatNumber(r.orders)} cmd · {Math.round((r.amount / total) * 100)} %</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-caption text-muted mt-4">Le détail par opérateur (Orange Money, Wave, MTN, carte) sera disponible une fois l'opérateur enregistré sur la commande.</p>
    </Card>
  )
}

/* ── Ventes par ville (30 jours) ───────────────────────────── */
export function CitiesCard(p: CardProps) {
  const g = guard(p); if (g) return g
  const cities = p.data!.cities
  const max = Math.max(1, ...cities.map(c => c.revenue))
  return (
    <Card padded className={p.className}>
      <CardHeader title="Ventes par ville" subtitle="Commandes payées sur 30 jours" />
      {cities.length === 0 ? <EmptyState icon={<MapPin size={22} />} title="Aucune vente sur 30 jours" className="py-8" /> : (
        <ul className="mt-5 space-y-3.5">
          {cities.map(c => (
            <li key={c.city}>
              <div className="flex items-center justify-between gap-3 text-secondary">
                <span className="text-ink-2 truncate">{c.city}</span>
                <span className="text-ink font-medium tabular shrink-0">{formatFCFA(c.revenue)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted-fill overflow-hidden">
                <div className="h-full rounded-full bg-coral" style={{ width: `${(c.revenue / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ── Stock faible ──────────────────────────────────────────── */
export function LowStockCard(p: CardProps) {
  const g = guard(p); if (g) return g
  const items = p.data!.lowStock
  return (
    <Card padded className={p.className}>
      <CardHeader title="Stock faible" subtitle={items.length ? `Produits actifs à ${items[0]!.threshold} unités ou moins` : undefined}
        actions={items.length ? <Link to="/products" className="text-caption font-medium text-primary hover:underline">Voir tout</Link> : undefined} />
      {items.length === 0 ? <EmptyState icon={<PackageCheck size={22} />} title="Aucun produit en stock faible" className="py-8" /> : (
        <ul className="mt-4 -mx-2">
          {items.map(it => (
            <li key={it.id}>
              <Link to={`/products/${it.id}`} className="flex items-center gap-3 px-2 py-2 rounded-nav hover:bg-hover-fill transition-colors">
                <span className="w-9 h-9 rounded-nav bg-muted-fill overflow-hidden shrink-0">
                  {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-secondary font-medium text-ink truncate">{it.name}</span>
                  <span className="block text-caption text-muted truncate">{it.store ?? 'Catalogue Skignas'}</span>
                </span>
                <StatusPill tone={it.stock === 0 ? 'pink' : 'yellow'}>{it.stock === 0 ? 'Rupture' : `${it.stock} en stock`}</StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ── Activité récente ──────────────────────────────────────── */
const ACTIVITY_ICON = { order: ShoppingCart, review: Star, store: Store, return: RotateCcw }

export function ActivityCard(p: CardProps) {
  const g = guard(p, 5); if (g) return g
  const items = p.data!.activity
  return (
    <Card padded className={p.className}>
      <CardHeader title="Activité récente" />
      {items.length === 0 ? <EmptyState icon={<Activity size={22} />} title="Aucune activité récente" className="py-8" /> : (
        <ol className="mt-4 relative">
          {items.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.type]
            return (
              <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < items.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" aria-hidden />}
                <span className="w-8 h-8 rounded-full border border-line bg-card text-ink-2 flex items-center justify-center shrink-0"><Icon size={14} /></span>
                <Link to={a.link} className="flex-1 min-w-0 pt-1 group">
                  <span className="block text-secondary text-ink group-hover:underline">{a.text}</span>
                  <span className={cn('block text-caption text-muted tabular')}>
                    {formatDate(a.at, 'datetime')}{a.amount !== null && ` · ${formatFCFA(a.amount)}`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
