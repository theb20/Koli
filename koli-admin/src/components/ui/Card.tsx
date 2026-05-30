import type { ReactNode } from 'react'

type Props = { children: ReactNode; className?: string; onClick?: () => void }

export function Card({ children, className = '', onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

type StatCardProps = {
  title: string
  value: string | number
  sub?: string
  icon: ReactNode
  trend?: number
  color?: string
}

export function StatCard({ title, value, sub, icon, trend, color = 'indigo' }: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    rose:   'bg-rose-50 text-rose-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          {trend !== undefined && (
            <p className={`mt-1.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs hier
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color] ?? colorMap.indigo}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
