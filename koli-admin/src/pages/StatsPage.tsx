import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { api, fmt } from '../lib/api'
import { PageTitle } from '../components/layout/Sidebar'
import { Card } from '../components/ui/Card'
import type { Order } from '../types'

async function fetchStats() {
  const [ordersRes, productsRes] = await Promise.all([
    api.get('/api/orders?limit=200'),
    api.get('/api/products?limit=100'),
  ])
  const orders: Order[] = ordersRes.data.data.orders ?? []
  const products = productsRes.data.data.products ?? []

  const days: Record<string, { revenue: number; orders: number; date: string }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    days[key] = { revenue: 0, orders: 0, date: key }
  }
  orders.forEach(o => {
    const d = new Date(o.createdAt)
    const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    if (days[key]) { days[key].revenue += o.total; days[key].orders++ }
  })

  const catRevenue: Record<string, number> = {}
  products.forEach((p: { category: string; sold: number; price: number }) => {
    catRevenue[p.category] = (catRevenue[p.category] ?? 0) + p.sold * p.price
  })
  const byCategory = Object.entries(catRevenue).map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  const payMethods: Record<string, number> = {}
  orders.forEach(o => { payMethods[o.paymentMethod] = (payMethods[o.paymentMethod] ?? 0) + 1 })
  const byPayment = Object.entries(payMethods).map(([method, count]) => ({ method, count }))

  const delivered = orders.filter(o => o.status === 'delivered')
  const avgOrder  = delivered.length ? Math.round(delivered.reduce((s, o) => s + o.total, 0) / delivered.length) : 0
  const convRate  = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0

  return {
    revenueByDay: Object.values(days),
    byCategory, byPayment, avgOrder, convRate,
    totalDelivered: delivered.length,
    totalCancelled: orders.filter(o => o.status === 'cancelled').length,
  }
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600">{p.name}: <span className="text-slate-900 font-medium">{p.name.includes('evenu') ? fmt(p.value) : p.value}</span></p>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['stats'], queryFn: fetchStats })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Statistiques" sub="Analyse des performances sur 30 jours" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Panier moyen', value: fmt(data?.avgOrder ?? 0), color: 'text-indigo-600' },
          { label: 'Taux livraison', value: `${data?.convRate ?? 0}%`, color: 'text-green-600' },
          { label: 'Commandes livrées', value: data?.totalDelivered ?? 0, color: 'text-blue-600' },
          { label: 'Commandes annulées', value: data?.totalCancelled ?? 0, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Revenue over 30 days */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Revenus & commandes — 30 jours</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data?.revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
              interval={Math.floor((data?.revenueByDay.length ?? 30) / 6)} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span style={{ color: '#64748b', fontSize: 11 }}>{v}</span>} />
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenu (FCFA)" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="orders" name="Commandes" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* By category */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Revenu par catégorie</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.byCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenu" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* By payment */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Commandes par méthode de paiement</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.byPayment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="method" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="Commandes" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
