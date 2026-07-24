import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Store, Users, Package, TrendingUp } from 'lucide-react'
import { api, fmt, fmtDate } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/Card'
import { PageTitle } from '../../components/layout/Sidebar'
import { Pagination } from '../../components/ui/Pagination'

interface MerchantListItem {
  id: number
  name: string
  logo: string | null
  phone: string | null
  isApproved: boolean
  createdAt: string
  owner: { id: string; prenom: string; nom: string; email: string; isBanned: boolean }
  productCount: number
  orderCount: number
  revenue: number
}

interface MerchantsResponse {
  sellers: MerchantListItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

async function fetchMerchants(page: number, search: string) {
  const q = new URLSearchParams({ page: String(page), limit: '20', ...(search ? { search } : {}) })
  const { data } = await api.get(`/api/admin/sellers?${q}`)
  return data.data as MerchantsResponse
}

export default function MerchantsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', page, search],
    queryFn:  () => fetchMerchants(page, search),
    placeholderData: (prev) => prev,
  })

  const sellers = data?.sellers ?? []
  const totalRevenue = sellers.reduce((s, m) => s + m.revenue, 0)

  return (
    <div className="space-y-5">
      <PageTitle title="Marchands" sub="Boutiques réellement provisionnées après approbation KYC" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Marchands" value={data?.pagination.total ?? 0} icon={<Store size={18} />} />
        <StatCard title="Produits en ligne" value={sellers.reduce((s, m) => s + m.productCount, 0)} icon={<Package size={18} />} color="blue" />
        <StatCard title="Commandes" value={sellers.reduce((s, m) => s + m.orderCount, 0)} icon={<Users size={18} />} color="purple" />
        <StatCard title="CA cumulé (page)" value={fmt(totalRevenue)} icon={<TrendingUp size={18} />} color="green" />
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher un marchand, un email…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Boutique', 'Propriétaire', 'Produits', 'Commandes', 'CA', 'Statut', 'Depuis', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : sellers.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <Store size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun marchand</p>
              </td></tr>
            ) : (
              sellers.map(m => (
                <tr key={m.id} onClick={() => navigate(`/merchants/${m.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {m.logo ? <img src={m.logo} alt="" className="w-full h-full object-cover" /> : <Store size={14} className="text-slate-400" />}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{m.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {m.owner.prenom} {m.owner.nom}<br /><span className="text-slate-400">{m.owner.email}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{m.productCount}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{m.orderCount}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{fmt(m.revenue)}</td>
                  <td className="px-4 py-3">
                    <Badge label={m.isApproved ? 'active' : 'inactive'} color={m.isApproved ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(m.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-indigo-600">Voir →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {data && (
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={20} onChange={setPage} />
        )}
      </div>
    </div>
  )
}
