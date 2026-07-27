import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import type { KpiColor } from '@/types/dashboard'

interface KpiCardProps {
  label: string
  value: string
  icon: ReactNode
  changePct?: number
  sparkline?: number[]
  color?: KpiColor
}

const COLOR_CLASSES: Record<KpiColor, string> = {
  blue: 'bg-[#1E90FF]/10 text-[#1E90FF]',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  purple: 'bg-violet-50 text-violet-600',
  slate: 'bg-[#f0f0ed] text-[#6b6b68]',
}

const SPARKLINE_STROKE: Record<KpiColor, string> = {
  blue: '#1E90FF',
  green: '#10b981',
  orange: '#f59e0b',
  red: '#f43f5e',
  purple: '#8b5cf6',
  slate: '#a3a3a1',
}

/** Carte KPI réutilisable pour tout le cockpit marchand — icône, variation,
 * mini sparkline et couleur configurables par métrique. */
export function KpiCard({ label, value, icon, changePct, sparkline, color = 'blue' }: KpiCardProps) {
  const isPositive = (changePct ?? 0) >= 0
  const sparkData = sparkline?.map((v, i) => ({ i, v }))

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider truncate">{label}</p>
          <p className="mt-1.5 text-xl font-extrabold text-[#0a0a0b] tracking-tight truncate">{value}</p>
          {changePct !== undefined && (
            <p
              className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${
                isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(changePct)}%
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${COLOR_CLASSES[color]}`}>{icon}</div>
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="h-8 mt-2 -mx-1" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke={SPARKLINE_STROKE[color]} strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
