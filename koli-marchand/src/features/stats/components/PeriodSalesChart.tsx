import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { fmtFcfa, fmtNumber } from '@/lib/format'
import type { PeriodSales } from '@/types'

interface PeriodSalesChartProps {
  data: PeriodSales[]
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: PeriodSales }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-[#0a0a0b]">{point.label}</p>
      <p className="text-[#6b6b68] mt-0.5">{fmtFcfa(point.revenue)}</p>
      <p className="text-[#6b6b68]">{fmtNumber(point.orders)} commandes</p>
    </div>
  )
}

export function PeriodSalesChart({ data }: PeriodSalesChartProps) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-[#0a0a0b] mb-4">Évolution du chiffre d'affaires — 12 derniers mois</h2>
      <div className="h-80" role="img" aria-label="Évolution du chiffre d'affaires sur 12 mois">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="periodRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E90FF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#1E90FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8e8e4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b6b68' }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6b6b68' }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1E90FF', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="revenue" stroke="#1E90FF" strokeWidth={2} fill="url(#periodRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
