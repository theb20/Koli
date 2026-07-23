import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  title: string
  value: string
  icon: ReactNode
  change?: number
  changeLabel?: string
}

export function StatCard({ title, value, icon, change, changeLabel = 'vs 7 jours précédents' }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">{title}</p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#0a0a0b] tracking-tight truncate">{value}</p>
          {change !== undefined && (
            <p
              className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
                isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(change).toFixed(1)}%
              <span className="font-normal text-[#6b6b68]">{changeLabel}</span>
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] shrink-0">{icon}</div>
      </div>
    </Card>
  )
}
