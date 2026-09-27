import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { capitalize, formatCompactFCFA, formatDate } from '../../lib/format'
import { METRIC, formatMetric, type MetricKey } from './metrics'
import type { Granularity, KpiResponse } from './api'

const label = (iso: string, g: Granularity) => {
  const d = new Date(`${iso}T00:00:00Z`)
  if (g === 'month') return capitalize(new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(d))
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
}

/** Évolution du KPI sélectionné : période (aire verte) vs comparaison (pointillés). */
export function TrendChart({ data, metric }: { data?: KpiResponse; metric: MetricKey }) {
  const m = METRIC[metric]
  if (!data) return <Card padded><Skeleton className="h-6 w-56" /><Skeleton className="h-[280px] w-full mt-6" /></Card>

  if (!m.point) {
    return (
      <Card padded>
        <CardHeader title={`Évolution : ${m.label}`} />
        <EmptyState title="Pas de courbe pour cet indicateur" text="Il est calculé sur l'ensemble de la période. Choisissez un autre indicateur pour voir son évolution." className="py-10" />
      </Card>
    )
  }
  const points = data.series.map((p, i) => {
    const prev = data.previousSeries?.[i]
    return { date: p.date, x: label(p.date, data.granularity), cur: m.point!(p), prev: prev ? m.point!(prev) : null, prevDate: prev?.date }
  })
  const yFmt = (v: number) => m.kind === 'money' ? formatCompactFCFA(v) : m.kind === 'percent' ? `${Math.round(v * 100)}%` : String(Math.round(v * 10) / 10)
  const unit = { day: 'par jour', week: 'par semaine', month: 'par mois' }[data.granularity]

  return (
    <Card padded>
      <CardHeader title={`Évolution : ${m.label}`} subtitle={`${capitalize(unit)} · ${formatDate(data.range.from, 'medium')} – ${formatDate(new Date(new Date(data.range.to).getTime() - 86_400_000), 'medium')}`}
        actions={data.previousSeries ? (
          <span className="flex items-center gap-4 text-caption text-ink-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded" /> Période</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-muted" /> Comparaison</span>
          </span>
        ) : undefined} />
      <div className="h-[300px] mt-6 -ml-2" role="img" aria-label={`Courbe ${m.label}`}>
        {/* initialDimension : évite l'avertissement « width(-1) » au premier rendu, avant la mesure du conteneur */}
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 300 }}>
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="kpiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={yFmt} width={56} />
            <Tooltip cursor={{ stroke: 'var(--border)' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]!.payload as (typeof points)[number]
              return (
                <div className="rounded-nav border border-line bg-card shadow-popover px-3 py-2.5 text-caption space-y-1">
                  <p className="text-ink-2">{formatDate(p.date, 'medium')} : <span className="font-semibold text-ink tabular">{formatMetric(m.kind, p.cur)}</span></p>
                  {p.prevDate && <p className="text-muted">{formatDate(p.prevDate, 'medium')} : <span className="tabular">{formatMetric(m.kind, p.prev)}</span></p>}
                </div>
              )
            }} />
            {data.previousSeries && <Line dataKey="prev" type="monotone" stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
            <Area dataKey="cur" type="monotone" stroke="var(--primary)" strokeWidth={2} fill="url(#kpiFill)" connectNulls animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
