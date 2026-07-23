import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { fmtFcfa, fmtNumber } from '@/lib/format'
import type { CategorySales } from '@/types'

interface CategorySalesChartProps {
  data: CategorySales[]
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategorySales }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-[#0a0a0b]">{point.category}</p>
      <p className="text-[#6b6b68] mt-0.5">{fmtFcfa(point.revenue)}</p>
      <p className="text-[#6b6b68]">{fmtNumber(point.unitsSold)} unités vendues</p>
    </div>
  )
}

export function CategorySalesChart({ data }: CategorySalesChartProps) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-[#0a0a0b] mb-4">Ventes par catégorie</h2>
      <div className="h-80" role="img" aria-label="Chiffre d'affaires par catégorie de produits">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#e8e8e4" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6b6b68' }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              width={150}
              tick={{ fontSize: 12, fill: '#0a0a0b' }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f5f3' }} />
            <Bar dataKey="revenue" fill="#1E90FF" radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
