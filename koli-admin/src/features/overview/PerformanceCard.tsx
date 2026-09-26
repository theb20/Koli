import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, ListFilter, RotateCw, BarChart3 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Menu, KebabMenu } from '../../components/ui/Menu'
import { StatRow } from '../../components/ui/Stat'
import { Skeleton, ErrorState } from '../../components/ui/States'
import { formatDate, formatNumber, percentChange } from '../../lib/format'
import { usePerformance, type Origin, type Period } from './api'

const PERIODS: Record<Period, string> = { '7d': '7 derniers jours', '30d': '30 derniers jours', month: 'Ce mois-ci', lastMonth: 'Mois dernier' }
const ORIGINS: Record<Origin, string> = { all: 'Toutes les commandes', skignas: 'Catalogue Skignas', merchants: 'Boutiques marchandes' }

export function PerformanceCard({ period, origin, onPeriod, onOrigin }: {
  period: Period; origin: Origin; onPeriod: (p: Period) => void; onOrigin: (o: Origin) => void
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = usePerformance(period, origin)

  return (
    <Card padded>
      <CardHeader title="Performance dans le temps" subtitle={formatDate(new Date(), 'medium')}
        actions={<>
          <Menu align="right" width={200} label="Période" items={(Object.keys(PERIODS) as Period[]).map(p => ({ label: PERIODS[p], onSelect: () => onPeriod(p) }))}
            trigger={({ open, toggle }) => (
              <Button variant="subtle" size="xs" icon={<ArrowUpDown size={12} />} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>{PERIODS[period]}</Button>
            )} />
          <Menu align="right" width={210} label="Filtrer" items={(Object.keys(ORIGINS) as Origin[]).map(o => ({ label: ORIGINS[o], onSelect: () => onOrigin(o) }))}
            trigger={({ open, toggle }) => (
              <Button variant="subtle" size="xs" icon={<ListFilter size={12} />} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
                {origin === 'all' ? 'Filtrer' : ORIGINS[origin]}
              </Button>
            )} />
          <KebabMenu items={[
            { label: 'Actualiser', icon: <RotateCw size={15} />, onSelect: () => qc.invalidateQueries({ queryKey: ['overview'] }) },
            { label: 'Voir les statistiques', icon: <BarChart3 size={15} />, onSelect: () => navigate('/stats') },
          ]} />
        </>} />
      <div className="h-px bg-line my-[22px]" />
      {isError ? <ErrorState onRetry={() => refetch()} className="py-4" />
        : isLoading || !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-32" /></div>)}</div>
        ) : (
          <StatRow items={[
            { label: 'Commandes livrées', value: formatNumber(data.current.delivered), delta: percentChange(data.current.delivered, data.previous.delivered) },
            { label: 'Commandes', value: formatNumber(data.current.orders), delta: percentChange(data.current.orders, data.previous.orders) },
            { label: 'Panier moyen', value: <>{formatNumber(data.current.avgBasket)}<span className="ml-1 text-body font-normal text-muted">FCFA</span></>, delta: percentChange(data.current.avgBasket, data.previous.avgBasket) },
            { label: 'Nouveaux clients', value: formatNumber(data.current.newCustomers), delta: percentChange(data.current.newCustomers, data.previous.newCustomers), highlight: true },
          ]} />
        )}
      <p className="sr-only">Variations calculées par rapport à la période précédente de même durée.</p>
    </Card>
  )
}
