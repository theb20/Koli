import { DollarSign, Percent, ShoppingBag, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { useDashboard } from './api/useDashboard'
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
  const { data, isLoading } = useDashboard()

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de l'activité de votre boutique" />

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
