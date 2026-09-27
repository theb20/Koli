import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/ui/States'
import { Card } from '../../components/ui/Card'
import { downloadCsv } from '../../lib/csv'
import { useBreakdowns, useKpis } from './api'
import { usePeriod } from './period'
import { PeriodToolbar } from './PeriodToolbar'
import { KpiGrid } from './KpiGrid'
import { TrendChart } from './TrendChart'
import { TargetsCard } from './TargetsCard'
import { CategoriesCard, CitiesCard, PaymentsCard, TopProductsTable } from './BreakdownCards'
import { METRICS, valueOf, type MetricKey } from './metrics'

function Reveal({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut', delay: i * 0.04 }}>
      {children}
    </motion.div>
  )
}

/** Valeur brute pour le CSV (taux en %, virgule décimale pour Excel FR). */
const csvValue = (kind: string, v: number | null) => {
  if (v === null) return ''
  if (kind === 'percent') return (v * 100).toFixed(1).replace('.', ',')
  if (kind === 'decimal' || kind === 'days') return v.toFixed(2).replace('.', ',')
  return Math.round(v)
}

/** Statistiques (/stats) — outils de KPI : période, comparaison, objectifs, répartitions, export. */
export default function StatsPage() {
  const period = usePeriod()
  const [metric, setMetric] = useState<MetricKey>('revenue')
  const kpis = useKpis(period.from, period.to, period.compare)
  const breakdowns = useBreakdowns(period.from, period.to)
  const bd = { data: breakdowns.data, isLoading: breakdowns.isLoading, isError: breakdowns.isError, onRetry: () => breakdowns.refetch() }

  const exportCsv = () => {
    const k = kpis.data
    if (!k) return
    const rows: (string | number | null)[][] = [
      [`Statistiques Skignas du ${period.from} au ${period.to}`],
      [],
      ['Indicateur', 'Période', ...(k.previous ? ['Comparaison'] : [])],
      ...METRICS.map(m => [
        m.label + (m.kind === 'percent' ? ' (%)' : m.kind === 'money' ? ' (FCFA)' : m.kind === 'days' ? ' (jours)' : ''),
        csvValue(m.kind, valueOf(k.current, m.key)),
        ...(k.previous ? [csvValue(m.kind, valueOf(k.previous, m.key))] : []),
      ]),
      [],
      ['Date', 'Commandes', 'Commandes payées', 'CA (FCFA)', 'Livrées', 'Annulées', 'Assistance (FCFA)', 'Nouveaux clients'],
      ...k.series.map(p => [p.date, p.orders, p.paidOrders, p.revenue, p.delivered, p.cancelled, p.assistance, p.newCustomers]),
    ]
    downloadCsv(`statistiques-skignas_${period.from}_${period.to}.csv`, rows)
  }

  return (
    <>
      <PageHeader title="Statistiques" subtitle="Suivez vos indicateurs clés, comparez les périodes et pilotez vos objectifs." />

      <div className="space-y-[18px]">
        <Reveal i={0}>
          <PeriodToolbar period={period} compareRange={kpis.data?.compareRange} onExport={exportCsv} />
        </Reveal>

        {kpis.isError ? (
          <Card><ErrorState onRetry={() => kpis.refetch()} /></Card>
        ) : (
          <>
            <Reveal i={1}><KpiGrid data={kpis.data} selected={metric} onSelect={setMetric} /></Reveal>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-[18px]">
              <Reveal i={2} className="min-w-0"><TrendChart data={kpis.data} metric={metric} /></Reveal>
              <Reveal i={3} className="min-w-0"><TargetsCard className="h-full" /></Reveal>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
          <Reveal i={4} className="min-w-0"><CategoriesCard {...bd} className="h-full" /></Reveal>
          <Reveal i={5} className="min-w-0"><PaymentsCard {...bd} className="h-full" /></Reveal>
          <Reveal i={6} className="min-w-0 md:col-span-2 xl:col-span-1"><CitiesCard {...bd} className="h-full" /></Reveal>
        </div>

        <Reveal i={7}><TopProductsTable {...bd} /></Reveal>
      </div>
    </>
  )
}
