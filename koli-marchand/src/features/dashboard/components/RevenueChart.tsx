import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { fmtFcfa } from '@/lib/format'
import type { RevenuePoint } from '@/types'

interface RevenueChartProps {
  data: RevenuePoint[]
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: RevenuePoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-[#0a0a0b] capitalize">{point.label}{point.isToday ? " (aujourd'hui)" : ''}</p>
      <p className="text-[#6b6b68] mt-0.5">{fmtFcfa(point.amount)}</p>
    </div>
  )
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-[#0a0a0b] mb-4">Chiffre d'affaires — 7 derniers jours</h2>
      <div className="h-64" role="img" aria-label="Graphique du chiffre d'affaires des 7 derniers jours">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e8e8e4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#6b6b68' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6b6b68' }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f5f3' }} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((point) => (
                <Cell key={point.date} fill={point.isToday ? '#1E90FF' : '#d4e8ff'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
