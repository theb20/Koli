import {
  DollarSign, Percent, ShoppingBag, ShoppingCart,
  Package, AlertTriangle, Users, UserPlus, Repeat, Star, RotateCcw, Heart, Wallet, PiggyBank,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { KpiCard } from '@/components/cards/KpiCard'
import { BarTrendChart } from '@/components/charts/BarTrendChart'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { fmtFcfa } from '@/lib/format'
import { useDashboard } from './api/useDashboard'
import { useDashboardFinance, useDashboardSummary } from './api/useDashboardSummary'
import { usePeriod } from './hooks/usePeriod'
import { RevenueChart } from './components/RevenueChart'
import { BestSellers } from './components/BestSellers'
import { RecentOrdersTable } from './components/RecentOrdersTable'

const ICONS = {
  revenue: DollarSign,
  orders: ShoppingCart,
  averageBasket: ShoppingBag,
  conversionRate: Percent,
} as const

export default function DashboardPage() {
  // Widgets historiques (best-sellers, commandes récentes) — inchangés,
  // toujours alimentés par /api/seller/dashboard tel quel.
  const { data, isLoading } = useDashboard()

  // Cockpit enrichi — nouvel endpoint dédié, période pilotée par le header.
  const { period, setPeriod, customRange, setCustomRange, range } = usePeriod()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(range)
  const { data: finance } = useDashboardFinance(summary)

  return (
    <div>
      <DashboardHeader
        period={period}
        onPeriodChange={setPeriod}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {summaryLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[104px] rounded-2xl bg-white border border-[#e8e8e4] animate-pulse" />
          ))}
        {summary && (
          <>
            <KpiCard
              label="Revenus"
              value={fmtFcfa(summary.revenue.current)}
              icon={<DollarSign size={18} />}
              changePct={summary.revenue.changePct}
              sparkline={summary.revenueSeries.map((p) => p.amount)}
              color="blue"
            />
            <KpiCard
              label="Commandes"
              value={String(summary.orders.current)}
              icon={<ShoppingCart size={18} />}
              changePct={summary.orders.changePct}
              sparkline={summary.ordersSeries.map((p) => p.count)}
              color="blue"
            />
            <KpiCard
              label="Panier moyen"
              value={fmtFcfa(summary.avgBasket.current)}
              icon={<ShoppingBag size={18} />}
              changePct={summary.avgBasket.changePct}
              color="slate"
            />
            <KpiCard label="Produits actifs" value={String(summary.products.active)} icon={<Package size={18} />} color="green" />
            <KpiCard label="Produits en rupture" value={String(summary.products.outOfStock)} icon={<AlertTriangle size={18} />} color="red" />
            <KpiCard label="Clients actifs" value={String(summary.customers.active)} icon={<Users size={18} />} color="purple" />
            <KpiCard label="Nouveaux clients" value={String(summary.customers.new)} icon={<UserPlus size={18} />} color="blue" />
            <KpiCard label="Clients fidèles" value={String(summary.customers.loyal)} icon={<Repeat size={18} />} color="purple" />
            <KpiCard
              label="Avis"
              value={summary.reviews.count ? `${summary.reviews.count} · ${summary.reviews.avgRating}★` : '0'}
              icon={<Star size={18} />}
              color="orange"
            />
            <KpiCard label="Retours" value={String(summary.returns.count)} icon={<RotateCcw size={18} />} color="red" />
            <KpiCard label="Produits favoris" value={String(summary.favorites.count)} icon={<Heart size={18} />} color="purple" />
            {finance && (
              <>
                <KpiCard label="Commission Skignas" value={`${fmtFcfa(finance.commission)} (${finance.commissionRate}%)`} icon={<Percent size={18} />} color="slate" />
                <KpiCard
                  label="Revenus nets"
                  value={fmtFcfa(finance.netRevenue)}
                  icon={<Wallet size={18} />}
                  sparkline={finance.netRevenueSeries.map((p) => p.amount)}
                  color="green"
                />
                <KpiCard label="Solde disponible" value={fmtFcfa(finance.walletBalance)} icon={<PiggyBank size={18} />} color="green" />
              </>
            )}
          </>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <BarTrendChart
            title="Chiffre d'affaires"
            data={summary.revenueSeries.map((p) => ({ date: p.date, label: p.label, value: p.amount }))}
            color="#1E90FF"
            formatValue={fmtFcfa}
            formatAxis={(v) => `${Math.round(v / 1000)}k`}
          />
          <BarTrendChart
            title="Commandes"
            data={summary.ordersSeries.map((p) => ({ date: p.date, label: p.label, value: p.count }))}
            color="#8b5cf6"
            formatValue={(v) => `${v} commande${v > 1 ? 's' : ''}`}
          />
        </div>
      )}
      {finance && (
        <div className="mb-6">
          <BarTrendChart
            title="Profit net (après commission)"
            data={finance.netRevenueSeries.map((p) => ({ date: p.date, label: p.label, value: p.amount }))}
            color="#10b981"
            formatValue={fmtFcfa}
            formatAxis={(v) => `${Math.round(v / 1000)}k`}
          />
        </div>
      )}

      <PageHeader title="Vue d'ensemble" subtitle="Chiffre d'affaires, meilleures ventes et commandes des 30 derniers jours" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[104px] rounded-2xl bg-white border border-[#e8e8e4] animate-pulse" />
          ))}
        {data?.kpis.map((kpi) => {
          const Icon = ICONS[kpi.key]
          return <StatCard key={kpi.key} title={kpi.label} value={kpi.value} change={kpi.change} icon={<Icon size={20} />} />
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">{data && <RevenueChart data={data.revenueByDay} />}</div>
        <div>{data && <BestSellers products={data.bestSellers} />}</div>
      </div>

      {data && <RecentOrdersTable orders={data.recentOrders} />}
    </div>
  )
}
