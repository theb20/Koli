import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ShoppingCart, Eye } from 'lucide-react'
import { api, fmt, fmtDateTime } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { PageTitle } from '../../components/layout/Sidebar'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Order, OrderStatus } from '../../types'

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'processing', label: 'En cours' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'refunded', label: 'Remboursées' },
]

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered',
}

async function fetchOrders(params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)]))
  const { data } = await api.get(`/api/orders/admin/all?${q}`)
  return data.data
}

export default function OrdersPage() {
  const navigate      = useNavigate()
  const qc            = useQueryClient()
  const [params]      = useSearchParams()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState(params.get('status') ?? '')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, debouncedSearch, status],
    queryFn: () => fetchOrders({ page, limit: 20, q: debouncedSearch, status }),
    placeholderData: (prev) => prev,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const orders: Order[] = data?.orders ?? []
  const pagination      = data?.pagination

  return (
    <div className="space-y-5">
      <PageTitle title="Commandes" sub={`${pagination?.total ?? 0} commandes au total`} />

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${status === s.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="N° commande, client, email..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['N° Commande', 'Client', 'Date', 'Articles', 'Paiement', 'Total', 'Statut', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucune commande</p>
              </td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-semibold text-indigo-600">{o.orderNumber}</p>
                    <p className="text-xs text-slate-400">{o.paymentMethod}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900">{o.clientPrenom} {o.clientNom}</p>
                    <p className="text-xs text-slate-400">{o.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{o.items?.length ?? 0} article(s)</td>
                  <td className="px-4 py-3"><Badge label={o.paymentStatus} /></td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(o.total)}</td>
                  <td className="px-4 py-3"><Badge label={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/orders/${o.id}`)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all" title="Voir le détail">
                        <Eye size={14} />
                      </button>
                      {NEXT_STATUS[o.status] && (
                        <button
                          onClick={() => updateStatus.mutate({ id: o.id, status: NEXT_STATUS[o.status] })}
                          disabled={updateStatus.isPending}
                          className="px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-[10px] font-medium transition-all disabled:opacity-40"
                        >
                          → {NEXT_STATUS[o.status]}
                        </button>
                      )}
                      {o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'refunded' && (
                        <button onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}
                          disabled={updateStatus.isPending}
                          className="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-medium transition-all disabled:opacity-40">
                          Annuler
                        </button>
                      )}
                    </div>
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
