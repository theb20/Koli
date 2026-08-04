import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ShoppingCart, Eye, Store, Download, Loader2, Trash2, RotateCcw, Archive } from 'lucide-react'
import { api, fmt, fmtDateTime } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { PageTitle } from '../../components/layout/Sidebar'
import { Confirm } from '../../components/ui/Modal'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Order, OrderStatus } from '../../types'

type SourceFilter = '' | 'merchant' | 'direct'

const SOURCES: { value: SourceFilter; label: string }[] = [
  { value: '',         label: 'Toutes origines' },
  { value: 'merchant', label: 'Marchand' },
  { value: 'direct',   label: 'Catalogue Skignas' },
]

// orange/mtn/wave : anciennes valeurs (avant simplification en une seule option "online")
const PAYMENT_LABELS: Record<string, string> = {
  online: 'En ligne', orange: 'Orange Money', mtn: 'MTN Money', wave: 'Wave', cash: 'À la livraison',
}

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

async function downloadInvoice(id: string, orderNumber: string) {
  const res = await api.get(`/api/orders/${id}/invoice`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `facture-${orderNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OrdersPage() {
  const navigate      = useNavigate()
  const qc            = useQueryClient()
  const [params]      = useSearchParams()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState(params.get('status') ?? '')
  const [source, setSource]   = useState<SourceFilter>('')
  const [showTrash, setShowTrash] = useState(false)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  const handleDownload = async (o: Order) => {
    setDownloadingId(o.id)
    try {
      await downloadInvoice(o.id, o.orderNumber)
    } catch {
      // silencieux — l'admin peut retenter, pas d'état d'erreur dédié pour une action secondaire de liste
    } finally {
      setDownloadingId(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, debouncedSearch, status, source, showTrash],
    queryFn: () => fetchOrders({ page, limit: 20, q: debouncedSearch, status: showTrash ? '' : status, source, deleted: showTrash ? 'true' : '' }),
    placeholderData: (prev) => prev,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.post('/api/orders/admin/bulk-delete', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      setSelected(new Set())
      setConfirmDelete(false)
    },
  })

  const restore = useMutation({
    mutationFn: (id: string) => api.post(`/api/orders/admin/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const orders: Order[] = data?.orders ?? []
  const pagination      = data?.pagination

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const allSelected = orders.length > 0 && orders.every(o => selected.has(o.id))
  const toggleSelectAll = () => {
    setSelected(prev => {
      if (allSelected) return new Set()
      return new Set(orders.map(o => o.id))
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <PageTitle title="Commandes" sub={`${pagination?.total ?? 0} commande${pagination?.total === 1 ? '' : 's'} ${showTrash ? 'dans la corbeille' : 'au total'}`} />
        <button
          onClick={() => { setShowTrash(v => !v); setSelected(new Set()); setPage(1) }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${showTrash
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Archive size={13} /> {showTrash ? 'Retour aux commandes' : 'Corbeille'}
        </button>
      </div>

      {!showTrash && (
        <>
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

          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-700 font-medium">{selected.size} commande{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}</p>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all"
              >
                <Trash2 size={13} /> Supprimer la sélection
              </button>
            </div>
          )}
        </>
      )}

      {!showTrash && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="N° commande, client, email..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
        </div>

        {/* Origine : catalogue Skignas vs boutique marchand */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
          {SOURCES.map(s => (
            <button
              key={s.value}
              onClick={() => { setSource(s.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${source === s.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {!showTrash && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-indigo-600" />
                </th>
              )}
              {(showTrash
                ? ['N° Commande', 'Client', 'Date', 'Total', 'Supprimée le', 'Par', 'Actions']
                : ['N° Commande', 'Client', 'Date', 'Articles', 'Paiement', 'Total', 'Statut', 'Actions']
              ).map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={showTrash ? 7 : 9} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={showTrash ? 7 : 9} className="py-16 text-center">
                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">{showTrash ? 'Corbeille vide' : 'Aucune commande'}</p>
              </td></tr>
            ) : showTrash ? (
              orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-semibold text-slate-500">{o.orderNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900">{o.clientPrenom} {o.clientNom}</p>
                    <p className="text-xs text-slate-400">{o.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(o.total)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{o.deletedAt ? fmtDateTime(o.deletedAt) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{o.deletedByName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => restore.mutate(o.id)} disabled={restore.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-all disabled:opacity-40">
                      <RotateCcw size={12} /> Restaurer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              orders.map(o => (
                <tr key={o.id} className={`hover:bg-slate-50 transition-colors group ${selected.has(o.id) ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelected(o.id)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-semibold text-indigo-600">{o.orderNumber}</p>
                    <p className="text-xs text-slate-400">{PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}</p>
                    {o.merchants && o.merchants.length > 0 && (
                      <div className="flex items-center gap-1 mt-1" title={o.merchants.map(m => m.name).join(', ')}>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                          <Store size={10} />
                          {o.merchants.length === 1 ? o.merchants[0].name : `${o.merchants.length} boutiques`}
                        </span>
                      </div>
                    )}
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
                      <button onClick={() => handleDownload(o)} disabled={downloadingId === o.id}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-40" title="Télécharger la facture">
                        {downloadingId === o.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
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
                      <button onClick={() => { setSelected(new Set([o.id])); setConfirmDelete(true) }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
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

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => bulkDelete.mutate([...selected])}
        loading={bulkDelete.isPending}
        title={`Supprimer ${selected.size} commande${selected.size > 1 ? 's' : ''} ?`}
        message="Elles seront retirées de la liste mais conservées dans la corbeille — restaurables à tout moment."
        confirmLabel="Supprimer"
      />
    </div>
  )
}
