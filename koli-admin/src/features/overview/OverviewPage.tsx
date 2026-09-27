import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/States'
import { useAuth } from '../../hooks/useAuth'
import { AgendaCard } from './AgendaCard'
import { TodoCard, TopProductsCard } from './WorkCards'
import { PaymentsCard, CitiesCard, LowStockCard, ActivityCard } from './AnalyticsCards'
import { useInsights, usePendingApplications } from './api'
import { useFinanceOverview } from './finance/api'
import { FinancePeriodFilter } from './finance/FinancePeriodFilter'
import { useFinancePeriod } from './finance/period'
import { VolumeBlock, CostsBlock, ProfitBlock, FinanceBlocksSkeleton } from './finance/FinanceBlocks'

/** Apparition des cartes : fondu + translateY(8px), 180 ms, décalage de 40 ms. */
function Reveal({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut', delay: i * 0.04 }}>
      {children}
    </motion.div>
  )
}

/**
 * Vue d'ensemble (/) — indicateurs financiers en trois blocs distincts
 * (volume d'affaires / coûts / rentabilité, calculés par l'API finance),
 * puis les cartes opérationnelles.
 */
export default function OverviewPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const period = useFinancePeriod()
  const finance = useFinanceOverview(period.preset, period.from, period.to)
  const insights = useInsights()
  const { data: applications } = usePendingApplications()
  const ins = { data: insights.data, isLoading: insights.isLoading, isError: insights.isError, onRetry: () => insights.refetch() }

  return (
    <>
      <PageHeader title="Tableau de bord"
        subtitle={<><strong className="font-semibold text-ink">Bienvenue{user?.prenom ? ` ${user.prenom}` : ''},</strong> voici l'activité de Skignas aujourd'hui.</>}
        cta={{ label: 'Nouveau produit', onClick: () => navigate('/products/new') }} />

      <div className="space-y-[18px]">
        <Reveal i={0}>
          <Card padded><FinancePeriodFilter period={period} range={finance.data?.range} /></Card>
        </Reveal>

        {finance.isError ? (
          <Card padded><ErrorState onRetry={() => finance.refetch()} className="py-6" /></Card>
        ) : !finance.data ? (
          period.preset === 'custom' && !(period.from && period.to)
            ? <Card padded><p className="text-body text-ink-2">Choisissez les dates de la période personnalisée.</p></Card>
            : <FinanceBlocksSkeleton />
        ) : (
          <div className={finance.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={finance.isFetching}>
            <div className="space-y-[18px]">
              <Reveal i={1}><VolumeBlock data={finance.data} /></Reveal>
              <Reveal i={2}><CostsBlock data={finance.data} /></Reveal>
              <Reveal i={3}><ProfitBlock data={finance.data} /></Reveal>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[55fr_45fr] gap-[18px]">
          <Reveal i={4} className="min-w-0"><TopProductsCard {...ins} className="h-full" /></Reveal>
          <Reveal i={5} className="min-w-0"><TodoCard {...ins} applications={applications} className="h-full" /></Reveal>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[55fr_45fr] gap-[18px]">
          <Reveal i={6} className="min-w-0"><ActivityCard {...ins} className="h-full" /></Reveal>
          {/* ≥1280 px : l'agenda prend la hauteur de l'activité récente et défile */}
          <Reveal i={7} className="min-w-0 xl:relative"><AgendaCard className="h-full xl:absolute xl:inset-0" /></Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
          <Reveal i={8} className="min-w-0"><PaymentsCard {...ins} className="h-full" /></Reveal>
          <Reveal i={9} className="min-w-0"><CitiesCard {...ins} className="h-full" /></Reveal>
          <Reveal i={10} className="min-w-0 md:col-span-2 xl:col-span-1"><LowStockCard {...ins} className="h-full" /></Reveal>
        </div>
      </div>
    </>
  )
}
