import { Link } from 'react-router-dom'
import { Layers, CreditCard, MapPin, Package } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/ui/States'
import { DonutChart } from '../../components/charts/DonutChart'
import { formatCompactFCFA, formatFCFA, formatNumber } from '../../lib/format'
import type { Breakdowns } from './api'

type P = { data?: Breakdowns; isLoading: boolean; isError: boolean; onRetry: () => void; className?: string }

const guard = (p: P) =>
  p.isLoading && !p.data ? <CardSkeleton lines={4} className={p.className} />
  : p.isError || !p.data ? <Card padded className={p.className}><ErrorState onRetry={p.onRetry} /></Card>
  : null

function Bars({ rows, color }: { rows: { label: string; value: number; hint: string }[]; color: 'bg-primary' | 'bg-coral' }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  return (
    <ul className="mt-5 space-y-3.5">
      {rows.map(r => (
        <li key={r.label}>
          <div className="flex items-center justify-between gap-3 text-secondary">
            <span className="text-ink-2 truncate">{r.label}</span>
            <span className="shrink-0 tabular"><span className="text-ink font-medium">{formatFCFA(r.value)}</span> <span className="text-caption text-muted">· {Math.round((r.value / total) * 100)} %</span></span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-muted-fill overflow-hidden" title={r.hint}>
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CategoriesCard(p: P) {
  const g = guard(p); if (g) return g
  const rows = p.data!.categories
  return (
    <Card padded className={p.className}>
      <CardHeader title="CA par catégorie" subtitle="Articles des commandes payées (HT livraison)" />
      {rows.length === 0 ? <EmptyState icon={<Layers size={22} />} title="Aucune vente sur la période" className="py-8" />
        : <Bars color="bg-primary" rows={rows.map(r => ({ label: r.name, value: r.revenue, hint: `${formatNumber(r.qty)} articles` }))} />}
    </Card>
  )
}

export function CitiesCard(p: P) {
  const g = guard(p); if (g) return g
  const rows = p.data!.cities
  return (
    <Card padded className={p.className}>
      <CardHeader title="Ventes par ville" subtitle="Commandes payées" />
      {rows.length === 0 ? <EmptyState icon={<MapPin size={22} />} title="Aucune vente sur la période" className="py-8" />
        : <Bars color="bg-coral" rows={rows.map(r => ({ label: r.city, value: r.revenue, hint: `${formatNumber(r.orders)} commandes` }))} />}
    </Card>
  )
}

const METHOD: Record<string, { label: string; color: string }> = {
  online: { label: 'Paiement en ligne', color: 'var(--primary)' },
  cash:   { label: 'À la livraison',    color: 'var(--coral)' },
}

export function PaymentsCard(p: P) {
  const g = guard(p); if (g) return g
  const rows = p.data!.payments.map(x => ({ ...x, ...(METHOD[x.method] ?? { label: x.method, color: 'var(--text-muted)' }) }))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return (
    <Card padded className={p.className}>
      <CardHeader title="Moyens de paiement" subtitle="Commandes payées" />
      {total === 0 ? <EmptyState icon={<CreditCard size={22} />} title="Aucun paiement sur la période" className="py-8" /> : (
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
    </Card>
  )
}

export function TopProductsTable(p: P) {
  const g = guard(p); if (g) return g
  const rows = p.data!.products
  return (
    <Card className={p.className}>
      <div className="p-[22px] pb-3"><CardHeader title="Top 10 produits" subtitle="Classés par chiffre d'affaires" /></div>
      {rows.length === 0 ? <EmptyState icon={<Package size={22} />} title="Aucune vente sur la période" className="py-8" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-secondary">
            <thead>
              <tr className="text-caption text-muted border-b border-line">
                <th className="text-left font-normal px-[22px] py-2.5">Produit</th>
                <th className="text-right font-normal px-3 py-2.5">Commandes</th>
                <th className="text-right font-normal px-3 py-2.5">Quantité</th>
                <th className="text-right font-normal px-[22px] py-2.5">CA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-app-bg transition-colors">
                  <td className="px-[22px] py-3">
                    <Link to={`/products/${r.id}`} className="flex items-center gap-3 text-ink hover:underline">
                      <span className="w-4 text-caption text-muted tabular">{i + 1}</span>
                      <span className="truncate max-w-[320px]">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-2 tabular">{formatNumber(r.orders)}</td>
                  <td className="px-3 py-3 text-right text-ink-2 tabular">{formatNumber(r.qty)}</td>
                  <td className="px-[22px] py-3 text-right font-medium text-ink tabular">{formatFCFA(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
