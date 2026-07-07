import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Users, Package, TrendingUp, Clock, AlertTriangle, CheckCircle2, XCircle, Percent, Receipt } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { api, fmt, fmtDateTime } from '../lib/api'
import { StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { Order } from '../types'

/* ── Stats from backend ─────────────────────────────────────── */
async function fetchDashboard() {
  const [ordersRes, productsRes, usersRes] = await Promise.all([
    api.get('/api/orders/admin/all?limit=200'),
    api.get('/api/products?limit=200'),
    api.get('/api/auth/users').catch(() => ({ data: { data: { users: [], pagination: { total: 0 } } } })),
  ])

  const orders: Order[]  = ordersRes.data.data.orders ?? []
  const products         = productsRes.data.data.products ?? []
  const totalUsers       = usersRes.data.data.pagination?.total ?? 0

  const deliveredOrders  = orders.filter(o => o.status === 'delivered')
  const totalRevenue     = deliveredOrders.reduce((s, o) => s + o.total, 0)
  const totalTax         = deliveredOrders.reduce((s, o) => s + (o.taxAmount ?? 0), 0)
  const totalHT          = totalRevenue - totalTax
  const pendingOrders    = orders.filter(o => o.status === 'pending').length
  const lowStock         = products.filter((p: { stock: number }) => p.stock < 5).length

  const days: Record<string, { revenue: number; orders: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })
    days[key] = { revenue: 0, orders: 0 }
  }
  orders.forEach(o => {
    const d = new Date(o.createdAt)
    const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })
    if (days[key]) { days[key].revenue += o.total; days[key].orders++ }
  })
  const revenueByDay = Object.entries(days).map(([date, v]) => ({ date, ...v }))

  const statusCount: Record<string, number> = {}
  orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1 })
  const ordersByStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }))

  const topMap: Record<string, number> = {}
  orders.forEach(o => o.items?.forEach((i: { name: string; qty: number }) => {
    topMap[i.name] = (topMap[i.name] ?? 0) + i.qty
  }))
  const topProducts = Object.entries(topMap)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }))

  return {
    totalRevenue, totalHT, totalTax, totalOrders: orders.length, totalUsers,
    totalProducts: products.length, pendingOrders, lowStock,
    recentOrders: orders.slice(0, 8), revenueByDay, ordersByStatus, topProducts,
  }
}

const STATUS_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#06b6d4','#ef4444','#94a3b8']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600">{p.name}: <span className="text-slate-900 font-medium">{p.name === 'Revenu' ? fmt(p.value) : p.value}</span></p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, refetchInterval: 30_000 })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vue d'ensemble </p>
      </div>

      {/* Stat Cards — ligne principale */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenu TTC" value={fmt(data?.totalRevenue ?? 0)} sub="Commandes livrées" icon={<TrendingUp size={20} />} color="green" />
        <StatCard title="Commandes" value={data?.totalOrders ?? 0} sub={`${data?.pendingOrders ?? 0} en attente`} icon={<ShoppingCart size={20} />} color="indigo" />
        <StatCard title="Clients" value={data?.totalUsers ?? 0} sub="Inscrits" icon={<Users size={20} />} color="blue" />
        <StatCard title="Produits" value={data?.totalProducts ?? 0} sub={`${data?.lowStock ?? 0} stock faible`} icon={<Package size={20} />} color={data?.lowStock ? 'orange' : 'purple'} />
      </div>

      {/* Bande HT / TVA / TTC */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Montant HT</p>
            <p className="text-lg font-black text-slate-900">{fmt(data?.totalHT ?? 0)}</p>
            <p className="text-[11px] text-slate-400">Hors taxes (livraisons incluses)</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Percent size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">TVA collectée</p>
            <p className="text-lg font-black text-amber-700">{fmt(data?.totalTax ?? 0)}</p>
            <p className="text-[11px] text-amber-500">Sur commandes livrées</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total TTC</p>
            <p className="text-lg font-black text-emerald-700">{fmt(data?.totalRevenue ?? 0)}</p>
            <p className="text-[11px] text-emerald-500">Toutes taxes comprises</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(data?.pendingOrders ?? 0) > 0 || (data?.lowStock ?? 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.pendingOrders ?? 0) > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <Clock size={16} className="text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">{data?.pendingOrders} commande(s) en attente de confirmation</p>
            </div>
          )}
          {(data?.lowStock ?? 0) > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-orange-600 shrink-0" />
              <p className="text-sm text-orange-800">{data?.lowStock} produit(s) avec stock faible (moins de 5)</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenus — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.revenueByDay ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenu" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status donut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Statuts commandes</h3>
          {(data?.ordersByStatus?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data?.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {data?.ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ color: '#64748b', fontSize: 11 }}>{v}</span>} />
                <Tooltip formatter={(v) => [v, 'commandes']} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-10">Aucune donnée</p>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Dernières commandes</h3>
            <a href="/orders" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors font-medium">Voir tout →</a>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.recentOrders.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400 truncate">{o.clientPrenom} {o.clientNom} · {fmtDateTime(o.createdAt)}</p>
                </div>
                <Badge label={o.status} />
                <p className="text-sm font-semibold text-slate-900 shrink-0">{fmt(o.total)}</p>
              </div>
            ))}
            {!data?.recentOrders.length && (
              <p className="text-center text-slate-400 py-8 text-sm">Aucune commande</p>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Produits les plus vendus</h3>
          </div>
          <div className="p-5 space-y-4">
            {data?.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300 w-4">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{p.name}</p>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (p.qty / (data.topProducts[0]?.qty || 1)) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{p.qty} ventes</span>
              </div>
            ))}
            {!data?.topProducts.length && <p className="text-slate-400 text-sm text-center py-4">Aucune vente</p>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Voir commandes en attente', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/orders?status=pending' },
          { label: 'Ajouter un produit', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/products/new' },
          { label: 'Commandes livrées', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', href: '/orders?status=delivered' },
          { label: 'Commandes annulées', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', href: '/orders?status=cancelled' },
        ].map(({ label, icon: Icon, color, bg, href }) => (
          <a key={label} href={href} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className={`p-1.5 rounded-lg ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
