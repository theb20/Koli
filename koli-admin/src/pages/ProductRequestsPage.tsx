import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, PackageSearch, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { api, fmt, fmtDate } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/Card'
import { PageTitle } from '../components/layout/Sidebar'
import { Pagination } from '../components/ui/Pagination'
import type { ProductRequest, ProductRequestStatus } from '../types'

type StatusFilter = 'all' | ProductRequestStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',        label: 'Toutes' },
  { value: 'new',        label: 'Nouvelles' },
  { value: 'processing', label: 'En cours' },
  { value: 'quoted',     label: 'Devis envoyé' },
  { value: 'fulfilled',  label: 'Traitées' },
  { value: 'rejected',   label: 'Refusées' },
  { value: 'cancelled',  label: 'Annulées' },
]

async function fetchRequests(page: number, status: StatusFilter) {
  const q = new URLSearchParams({ page: String(page), limit: '20', ...(status !== 'all' ? { status } : {}) })
  const { data } = await api.get(`/api/product-requests/admin/all?${q}`)
  return data.data as { requests: ProductRequest[]; pagination: { total: number; totalPages: number } }
}

export default function ProductRequestsPage() {
  const navigate = useNavigate()
  const [page, setPage]     = useState(1)
  const [status, setStatus] = useState<StatusFilter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['product-requests', page, status],
    queryFn:  () => fetchRequests(page, status),
    placeholderData: (prev) => prev,
  })

  const { data: allData } = useQuery({
    queryKey: ['product-requests', 'stats-all'],
    queryFn:  () => fetchRequests(1, 'all'),
  })
  const { data: newData } = useQuery({
    queryKey: ['product-requests', 'stats-new'],
    queryFn:  () => fetchRequests(1, 'new'),
  })

  const requests   = data?.requests ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      <PageTitle title="Demandes de sourcing" sub="Demandes de produits déposées via « Trouver un produit »" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={allData?.pagination.total ?? 0} icon={<PackageSearch size={18} />} />
        <StatCard title="Nouvelles" value={newData?.pagination.total ?? 0} icon={<Clock size={18} />} color="orange" />
        <StatCard title="Traitées" value={requests.filter(r => r.status === 'fulfilled').length} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="Refusées" value={requests.filter(r => r.status === 'rejected').length} icon={<XCircle size={18} />} color="rose" />
      </div>

      <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => { setStatus(t.value); setPage(1) }}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              status === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Produit', 'Client', 'Quantité', 'Budget', 'Statut', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Search size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucune demande</p>
              </td></tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} onClick={() => navigate(`/product-requests/${r.id}`)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${r.status === 'new' ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.images?.[0] && (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          <img src={r.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{r.productName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{r.clientPrenom} {r.clientNom}</p>
                    <p className="text-xs text-slate-400">{r.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.quantity ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.budget ? fmt(r.budget) : '—'}</td>
                  <td className="px-4 py-3"><Badge label={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-indigo-600">Voir →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {pagination && (
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={20} onChange={setPage} />
        )}
      </div>
    </div>
  )
}
