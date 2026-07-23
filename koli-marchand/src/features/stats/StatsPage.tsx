import { PageHeader } from '@/components/ui/PageHeader'
import { useStats } from './api/useStats'
import { CategorySalesChart } from './components/CategorySalesChart'
import { PeriodSalesChart } from './components/PeriodSalesChart'

export default function StatsPage() {
  const { data, isLoading } = useStats()

  return (
    <div>
      <PageHeader title="Statistiques" subtitle="Analysez la performance de votre boutique dans le temps" />

      {isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-96 rounded-2xl bg-white border border-[#e8e8e4] animate-pulse" />
          <div className="h-96 rounded-2xl bg-white border border-[#e8e8e4] animate-pulse" />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CategorySalesChart data={data.categorySales} />
          <PeriodSalesChart data={data.periodSales} />
        </div>
      )}
    </div>
  )
}
