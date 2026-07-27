import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'

interface TrendPoint {
  date: string
  label: string
  value: number
}

interface BarTrendChartProps {
  title: string
  data: TrendPoint[]
  color?: string
  formatValue?: (v: number) => string
  formatAxis?: (v: number) => string
}

function ChartTooltip({ active, payload, formatValue }: { active?: boolean; payload?: { payload: TrendPoint }[]; formatValue: (v: number) => string }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-[#0a0a0b] capitalize">{point.label}</p>
      <p className="text-[#6b6b68] mt-0.5">{formatValue(point.value)}</p>
    </div>
  )
}

/** Graphique en barres réutilisable pour toute série temporelle du cockpit
 * (revenus, commandes, profit net…) — évite de dupliquer un BarChart quasi
 * identique pour chaque métrique. */
export function BarTrendChart({ title, data, color = '#1E90FF', formatValue = String, formatAxis }: BarTrendChartProps) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-[#0a0a0b] mb-4">{title}</h2>
      <div className="h-64" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e8e8e4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b6b68' }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6b6b68' }}
              tickFormatter={formatAxis ?? ((v: number) => String(v))}
              width={40}
            />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ fill: '#f5f5f3' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
