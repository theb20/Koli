import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ArrowUpRight, PiggyBank, AlertTriangle, Package, Truck } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { DeltaBadge } from '../../../components/ui/Stat'
import { InfoTip } from '../../../components/ui/InfoTip'
import { Skeleton, EmptyState } from '../../../components/ui/States'
import { cn } from '../../../lib/cn'
import { capitalize, formatDate, formatFCFA, formatNumber } from '../../../lib/format'
import type { FinanceOverview } from './api'

/* Présentation seulement : toutes les valeurs arrivent calculées par l'API. */

type Tone = 'volume' | 'costs' | 'profit'
const TONES: Record<Tone, { accent: string; chip: string; bar: string }> = {
  volume: { accent: 'border-t-fin-volume', chip: 'bg-fin-volume/12 text-fin-volume', bar: 'bg-fin-volume' },
  costs:  { accent: 'border-t-fin-costs',  chip: 'bg-fin-costs/12 text-fin-costs',   bar: 'bg-fin-costs' },
  profit: { accent: 'border-t-fin-profit', chip: 'bg-fin-profit/12 text-fin-profit', bar: 'bg-fin-profit' },
}

function Block({ tone, icon, title, tagline, children }: { tone: Tone; icon: ReactNode; title: string; tagline: string; children: ReactNode }) {
  return (
    <Card padded className={cn('border-t-[3px]', TONES[tone].accent)}>
      <section aria-label={title}>
        <header className="flex items-start gap-3 mb-5">
          <span className={cn('w-9 h-9 rounded-nav flex items-center justify-center shrink-0', TONES[tone].chip)} aria-hidden>{icon}</span>
          <div className="min-w-0">
            <h2 className="text-card-title font-medium text-ink leading-tight">{title}</h2>
            <p className="text-secondary text-muted mt-0.5">{tagline}</p>
          </div>
        </header>
        {children}
      </section>
    </Card>
  )
}

type MetricProps = {
  label: string
  help: string
  value: ReactNode
  sub?: ReactNode
  delta?: number | null
  scope?: string
  negative?: boolean
}

function Metric({ label, help, value, sub, delta, scope, negative }: MetricProps) {
  return (
    <div className="relative rounded-input border border-line p-4 min-w-0">
      <p className="flex items-start gap-1.5 text-secondary text-ink-2">
        <span className="min-w-0 break-words">{label}</span>
        <InfoTip label={label} text={help} />
      </p>
      <p className={cn('mt-2 text-[20px] sm:text-kpi font-medium leading-none tabular break-words', negative ? 'text-down' : 'text-ink')}>{value}</p>
      {(delta !== undefined || scope || sub) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 min-h-5">
          {delta !== undefined && <DeltaBadge value={delta} />}
          {scope && <span className="inline-flex h-5 items-center px-1.5 rounded-full bg-muted-fill text-micro font-medium text-ink-2">{scope}</span>}
          {sub && <span className="text-caption text-muted">{sub}</span>}
        </div>
      )}
    </div>
  )
}

const money = (n: number) => formatFCFA(n)
const plural = (n: number, word: string) => `${formatNumber(n)} ${word}${n > 1 ? 's' : ''}`

export function VolumeBlock({ data }: { data: FinanceOverview }) {
  const v = data.volume
  const now = new Date()
  return (
    <Block tone="volume" icon={<ArrowLeftRight size={17} />} title="Volume d'affaires"
      tagline="Ce qui transite par Skignas. Ce n'est pas un revenu : il inclut la part des fournisseurs et la TVA.">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3">
        <Metric label="CA TTC total" scope="Toutes périodes" value={money(v.revenueTtcAllTime)}
          help="Montants TTC payés par les clients depuis l'ouverture, livraison incluse, remboursements déduits. Ne suit pas le filtre de période." />
        <Metric label={`CA TTC ${now.getUTCFullYear()}`} scope="Année en cours" value={money(v.revenueTtcYear)}
          help="Même calcul que le CA TTC total, du 1er janvier à aujourd'hui." />
        <Metric label={`CA TTC ${capitalize(formatDate(now, 'monthYear'))}`} scope="Mois en cours" value={money(v.revenueTtcMonth)} delta={v.monthChangePct}
          help="Du 1er du mois à aujourd'hui. La variation compare au mois précédent sur le même nombre de jours." />
        <Metric label="CA HT de la période" value={money(v.revenueHt)}
          help="Produits et assistance technique hors TVA et hors frais de livraison, remises et remboursements déduits." />
        <Metric label="Commandes payées" value={formatNumber(v.orders)}
          help="Commandes payées sur la période (date de paiement), hors annulées et remboursées." />
        <Metric label="Panier moyen TTC" value={money(v.avgBasketTtc)}
          help="CA TTC de la période divisé par le nombre de commandes payées." />
      </div>
    </Block>
  )
}

export function CostsBlock({ data }: { data: FinanceOverview }) {
  const c = data.costs, cov = data.coverage
  return (
    <Block tone="costs" icon={<ArrowUpRight size={17} />} title="Coûts"
      tagline="Ce qui sort : fournisseurs, TVA reversée à l'État, livraison.">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3">
        <Metric label="Coût d'achat des produits vendus" value={money(c.cogs)}
          help="Prix d'achat HT figés au paiement × quantités vendues et non remboursées, fournisseurs en mode marge." />
        <Metric label="Reversé aux fournisseurs" value={money(c.supplierPayout)}
          help="Coût d'achat (mode marge) + vente HT moins notre commission (mode commission et boutiques marchandes)." />
        <Metric label="TVA collectée" value={money(c.vatCollected)}
          help="TVA facturée aux clients sur la période, part des remboursements déduite. Elle est due à l'État." />
        <Metric label="Coût de livraison supporté" value={money(c.shippingCost)}
          sub={cov.shippingUnknownOrders > 0 ? `${plural(cov.shippingUnknownOrders, 'commande')} sans coût réel renseigné` : undefined}
          help="Somme des coûts réels de livraison saisis sur les commandes de la période (détail commande → Rentabilité)." />
      </div>
    </Block>
  )
}

function TopList<T>({ title, help, items, empty, render }: {
  title: string; help: string; items: T[]; empty: string
  render: (item: T) => { key: string; name: ReactNode; sub: string; value: number }
}) {
  const rows = items.map(render)
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="relative rounded-input border border-line p-4 min-w-0">
      <h3 className="flex items-center gap-1.5 text-secondary font-medium text-ink mb-3">{title}<InfoTip label={title} text={help} /></h3>
      {rows.length === 0 ? <EmptyState icon={<Package size={20} />} title={empty} className="py-4" /> : (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.key} className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="w-4 text-caption text-muted tabular shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-secondary text-ink">{r.name}</span>
                <span className={cn('text-secondary font-medium tabular shrink-0', r.value < 0 ? 'text-down' : 'text-ink')}>{money(r.value)}</span>
              </div>
              <div className="ml-6 mt-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted-fill overflow-hidden">
                  <div className={cn('h-full rounded-full', TONES.profit.bar)} style={{ width: `${Math.max(0, r.value) / max * 100}%` }} />
                </div>
                <span className="text-micro text-muted whitespace-nowrap">{r.sub}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const pct = (v: number | null) => v == null ? '—' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v)}\u00A0%`

export function ProfitBlock({ data }: { data: FinanceOverview }) {
  const p = data.profit, cov = data.coverage
  return (
    <Block tone="profit" icon={<PiggyBank size={17} />} title="Rentabilité"
      tagline="Ce qui reste réellement à Skignas, calculé sur les coûts figés au moment du paiement.">
      {cov.excludedOrders > 0 && (
        <div role="note" className="mb-4 flex items-start gap-2.5 rounded-input border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-secondary text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong className="font-medium">{plural(cov.excludedOrders, 'commande')} exclue{cov.excludedOrders > 1 ? 's' : ''} des calculs de marge</strong>
            {cov.excludedSharePct != null && ` (${pct(cov.excludedSharePct)} des commandes de la période)`} : coût fournisseur inconnu
            (commandes antérieures au suivi, ou produits sans prix d'achat). Elles restent comptées dans le volume d'affaires.{' '}
            <Link to="/suppliers" className="underline underline-offset-2">Renseigner les fournisseurs</Link>
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3">
        <Metric label="Marge brute HT" value={money(p.grossMargin)} negative={p.grossMargin < 0}
          sub={p.services > 0 ? `dont assistance ${money(p.services)}` : undefined}
          help="Ventes HT moins les montants reversés aux fournisseurs, plus l'assistance technique. Commandes à coût connu uniquement." />
        <Metric label="Taux de marge brute" value={pct(p.marginRatePct)}
          sub={cov.marginOrders > 0 ? `sur ${money(cov.marginRevenueHt)} HT` : undefined}
          help="Marge brute divisée par le CA HT des commandes à coût connu, × 100." />
        <Metric label="Commissions perçues" value={money(p.commissions)}
          help="Part prélevée sur les ventes des fournisseurs en mode commission et des boutiques marchandes (taux figé au paiement)." />
        <Metric label="Résultat livraison" value={money(p.shippingResult)} negative={p.shippingResult < 0}
          sub={<span className="inline-flex items-center gap-1"><Truck size={11} aria-hidden />hors commandes sans coût réel</span>}
          help="Frais de livraison facturés moins le coût réel, sur les commandes dont le coût réel est renseigné. Séparé de la marge produit." />
        <Metric label="Marge moyenne par commande" value={money(p.avgMarginPerOrder)} negative={p.avgMarginPerOrder < 0}
          sub={`${plural(cov.marginOrders, 'commande')} à coût connu`}
          help="Marge brute divisée par le nombre de commandes à coût connu." />
      </div>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TopList title="Top 5 produits les plus rentables" items={p.topProducts} empty="Aucune vente à coût connu"
          help="Classés par marge produit HT absolue (pas par chiffre d'affaires), sur les quantités non remboursées."
          render={x => ({ key: String(x.id), name: <Link to={`/products/${x.id}`} className="hover:underline">{x.name}</Link>, value: x.margin,
            sub: `${plural(x.qty, 'vendu')} · ${pct(x.marginRate)}` })} />
        <TopList title="Top 5 fournisseurs par marge générée" items={p.topSuppliers} empty="Aucune vente à coût connu"
          help="Marge produit HT générée par les ventes de chaque fournisseur ou boutique marchande (commission)."
          render={x => ({
            key: `${x.kind}-${x.id}`, value: x.margin, sub: plural(x.orders, 'commande'),
            name: x.kind === 'none' ? <span className="text-muted">Sans fournisseur renseigné</span>
              : <>{x.name ?? 'Fournisseur supprimé'}{x.kind === 'merchant' && <span className="ml-1.5 text-micro text-muted">boutique</span>}</>,
          })} />
      </div>
    </Block>
  )
}

export function FinanceBlocksSkeleton() {
  return (
    <div className="space-y-[18px]">
      {[6, 4, 5].map((count, b) => (
        <Card key={b} padded className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: count }, (_, i) => <div key={i} className="rounded-input border border-line p-4 space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-32" /></div>)}
          </div>
        </Card>
      ))}
    </div>
  )
}
