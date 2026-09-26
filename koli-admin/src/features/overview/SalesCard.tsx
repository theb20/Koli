import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ShoppingCart } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { KebabMenu } from '../../components/ui/Menu'
import { DeltaBadge } from '../../components/ui/Stat'
import { Skeleton, ErrorState } from '../../components/ui/States'
import { BarChartRounded } from '../../components/charts/BarChartRounded'
import { capitalize, formatCompactFCFA, formatDate, formatFCFA, formatNumber, percentChange } from '../../lib/format'
import { useSales } from './api'

const monthDate = (m: string) => new Date(`${m}-01T00:00:00Z`)
const shortMonth = (m: string) => capitalize(new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(monthDate(m)).replace('.', ''))

export function SalesCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSales()
  const currentKey = data?.months.at(-1)?.month
  const [selected, setSelected] = useState<string | null>(null)
  const sel = selected ?? currentKey

  if (isError) return <Card padded className={className}><ErrorState onRetry={() => refetch()} /></Card>
  if (isLoading || !data || !sel) {
    return <Card padded className={className}><Skeleton className="h-6 w-48" /><Skeleton className="h-9 w-56 mt-5" /><Skeleton className="h-[200px] w-full mt-8" /></Card>
  }

  const idx = data.months.findIndex(m => m.month === sel)
  const month = data.months[idx]!
  const isCurrent = sel === currentKey
  // Mois courant : comparé au mois dernier sur le même nombre de jours ; sinon mois complet précédent
  const delta = isCurrent
    ? percentChange(data.current, data.previousSamePeriod)
    : idx > 0 ? percentChange(month.revenue, data.months[idx - 1]!.revenue) : null
  const best = Math.max(1, ...data.months.map(m => m.revenue))

  return (
    <Card padded className={className}>
      <CardHeader title="Performance des ventes"
        actions={<KebabMenu items={[
          { label: 'Voir les commandes', icon: <ShoppingCart size={15} />, onSelect: () => navigate('/orders') },
          { label: 'Voir les statistiques', icon: <BarChart3 size={15} />, onSelect: () => navigate('/stats') },
        ]} />} />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[26px] sm:text-amount font-medium text-ink leading-none tabular">{formatFCFA(month.revenue)}</p>
          <p className="text-body text-muted mt-2">
            {isCurrent ? `Au ${formatDate(new Date(), 'medium')}` : capitalize(formatDate(monthDate(sel), 'monthYear'))}
          </p>
        </div>
        {delta !== null && (
          <p className="flex items-center gap-2 text-secondary text-ink-2 pt-1.5">
            <DeltaBadge value={delta} variant="arrow" /> vs mois dernier
          </p>
        )}
      </div>
      <div className="mt-8">
        <BarChartRounded ariaLabel="Chiffre d'affaires des 6 derniers mois" selected={sel} onSelect={setSelected} current={currentKey}
          average={{ value: data.average, label: `Moy. ${formatCompactFCFA(data.average)}` }}
          bars={data.months.map(m => ({
            key: m.month, label: shortMonth(m.month), value: m.revenue,
            tooltip: (
              <div className="space-y-1">
                <p className="font-semibold text-ink">{capitalize(formatDate(monthDate(m.month), 'monthYear'))}</p>
                <p className="text-ink-2">CA : <span className="text-ink font-medium tabular">{formatFCFA(m.revenue)}</span></p>
                <p className="text-ink-2">Commandes payées : <span className="text-ink font-medium tabular">{formatNumber(m.orders)}</span></p>
                <p className="text-ink-2">Meilleur mois : <span className="text-ink font-medium tabular">{Math.round((m.revenue / best) * 100)} %</span></p>
              </div>
            ),
          }))} />
      </div>
      <p className="sr-only">
        {data.months.map(m => `${shortMonth(m.month)} : ${formatFCFA(m.revenue)}`).join(', ')}. Moyenne : {formatFCFA(data.average)}.
      </p>
    </Card>
  )
}
