import { useId, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import type { MetricDefinition, OverviewKpi } from '@/types/dashboard'
import { fmtRate, signed } from './format'

type Props = {
  label: string
  value: string
  kpi?: OverviewKpi
  /** Format de l'écart absolu (même unité que la valeur ; points pour un taux) */
  formatAbs?: (n: number) => string
  /** Une hausse est mauvaise (ex. taux de retour) : couleurs inversées */
  invert?: boolean
  definition?: MetricDefinition
  footnote?: ReactNode
  icon: ReactNode
  accent: string
}

function Delta({ label, abs, pct, formatAbs, invert }: { label: string; abs: number; pct: number | null; formatAbs: (n: number) => string; invert?: boolean }) {
  const tone = abs === 0 ? 'text-[#6b6b68]' : (abs > 0) !== !!invert ? 'text-emerald-600' : 'text-rose-600'
  return (
    <p className="text-[11px] leading-snug text-[#6b6b68]">
      <span className={`font-semibold ${tone}`}>
        {pct != null ? signed(pct, fmtRate) : signed(abs, formatAbs)}
        {pct != null && abs !== 0 && <span className="font-normal"> ({signed(abs, formatAbs)})</span>}
      </span>{' '}
      {label}
    </p>
  )
}

/** Indicateur de l'accueil : valeur, écarts vs période précédente et vs an dernier, courbe 30 jours, définition. */
export function OverviewKpiCard({ label, value, kpi, formatAbs = String, invert, definition, footnote, icon, accent }: Props) {
  const tipId = useId()
  const spark = kpi?.sparkline?.map((v, i) => ({ i, v }))
  return (
    <Card className="relative p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#6b6b68] uppercase tracking-wider min-w-0">
          <span className="truncate">{label}</span>
          {definition && (
            <span className="group/tip inline-flex normal-case tracking-normal">
              <button type="button" aria-label={`Définition : ${label}`} aria-describedby={tipId}
                className="text-[#a3a3a1] hover:text-[#0a0a0b] focus-visible:text-[#0a0a0b] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF]/40">
                <Info size={13} aria-hidden />
              </button>
              <span role="tooltip" id={tipId}
                className="hidden group-hover/tip:block group-focus-within/tip:block absolute left-3 right-3 top-9 z-20 rounded-xl bg-[#0a0a0b] text-white text-xs font-normal leading-snug p-3 shadow-lg">
                <strong className="block font-semibold mb-1">{definition.name}</strong>
                {definition.definition}
                <span className="block mt-1.5 text-white/70">{definition.formula}</span>
              </span>
            </span>
          )}
        </p>
        <span className="p-2 rounded-xl shrink-0" style={{ background: `${accent}14`, color: accent }} aria-hidden>{icon}</span>
      </div>
      <p className="text-xl font-extrabold text-[#0a0a0b] tracking-tight tabular-nums truncate">{value}</p>
      {kpi && (
        <div className="flex flex-col gap-0.5">
          <Delta label="vs période précédente" abs={kpi.vsPrevious.abs} pct={kpi.vsPrevious.pct} formatAbs={formatAbs} invert={invert} />
          <Delta label="vs an dernier" abs={kpi.vsLastYear.abs} pct={kpi.vsLastYear.pct} formatAbs={formatAbs} invert={invert} />
        </div>
      )}
      {footnote && <p className="text-[11px] text-[#6b6b68] leading-snug">{footnote}</p>}
      {spark && spark.length > 1 && (
        <div className="h-8 -mx-1 mt-auto" aria-hidden="true" title="30 derniers jours de la période">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
