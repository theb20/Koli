import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Clock } from 'lucide-react'
import { api, fmtDate } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/Card'
import { Confirm, Modal } from '../components/ui/Modal'
import { Textarea } from '../components/ui/Input'
import { PageTitle } from '../components/layout/Sidebar'

type Status = 'requested' | 'approved' | 'rejected' | 'cancelled'
type StatusFilter = 'all' | Status

interface DeletionRequest {
  id: string
  status: Status
  reason: string | null
  rejectionReason: string | null
  requestedAt: string
  resolvedAt: string | null
  product: { id: number; name: string; isActive: boolean; images: { url: string }[] }
  store: { id: number; name: string }
  requestedBy: { id: string; prenom: string; nom: string; email: string }
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'Toutes' },
  { value: 'requested', label: 'En attente' },
  { value: 'approved',  label: 'Approuvées' },
  { value: 'rejected',  label: 'Refusées' },
  { value: 'cancelled', label: 'Annulées' },
]

async function fetchRequests(status: StatusFilter) {
  const q = status !== 'all' ? `?status=${status}` : ''
  const { data } = await api.get(`/api/admin/product-deletion-requests${q}`)
  return data.data as DeletionRequest[]
}

export default function ProductDeletionRequestsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('requested')
  const [approveId, setApproveId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DeletionRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['product-deletion-requests', status],
    queryFn:  () => fetchRequests(status),
    placeholderData: (prev) => prev,
  })
  const { data: allRequests = [] } = useQuery({
    queryKey: ['product-deletion-requests', 'all'],
    queryFn:  () => fetchRequests('all'),
  })
  const pendingCount = allRequests.filter(r => r.status === 'requested').length

  const resolve = useMutation({
    mutationFn: (body: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) =>
      api.put(`/api/admin/product-deletion-requests/${body.id}/status`, { status: body.status, rejectionReason: body.rejectionReason }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['product-deletion-requests'] })
      qc.invalidateQueries({ queryKey: ['admin-counters'] })
      setApproveId(null)
      setRejectTarget(null)
      setRejectionReason('')
      if (vars.status === 'approved') {
        const result = res.data.deletionResult
        toast.success(result === 'hard' ? 'Produit supprimé définitivement.' : 'Produit déjà commandé : désactivé (historique conservé).')
      } else {
        toast.success('Demande refusée — le marchand est notifié.')
      }
    },
    onError: e => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Échec de l’opération'),
  })

  return (
    <div className="space-y-5">
      <PageTitle title="Demandes de suppression" sub="Un marchand ne peut jamais supprimer un produit lui-même — seul l'admin décide" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={allRequests.length} icon={<Trash2 size={18} />} />
        <StatCard title="En attente" value={pendingCount} icon={<Clock size={18} />} color="orange" />
      </div>

      <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setStatus(t.value)}
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
              {['Produit', 'Boutique', 'Marchand', 'Motif', 'Statut', 'Demandée le', ''].map(h => (
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
                <Trash2 size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucune demande</p>
              </td></tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.status === 'requested' ? 'bg-yellow-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        {r.product.images?.[0] && <img src={r.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{r.product.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.store.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{r.requestedBy.prenom} {r.requestedBy.nom}</p>
                    <p className="text-xs text-slate-400">{r.requestedBy.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate" title={r.reason ?? undefined}>
                    {r.reason ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={r.status} />
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-xs text-slate-400 mt-1 max-w-[160px] truncate" title={r.rejectionReason}>{r.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.requestedAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'requested' && (
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setApproveId(r.id)}>Approuver</Button>
                        <Button variant="danger" size="sm" onClick={() => setRejectTarget(r)}>Refuser</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Confirm
        open={approveId !== null}
        onClose={() => setApproveId(null)}
        onConfirm={() => approveId && resolve.mutate({ id: approveId, status: 'approved' })}
        loading={resolve.isPending}
        title="Approuver la suppression ?"
        message="Si le produit n'a jamais été commandé, il sera supprimé définitivement (irréversible). S'il a déjà été commandé, il sera seulement désactivé, pour préserver l'historique des commandes."
        confirmLabel="Approuver"
      />

      <Modal open={rejectTarget !== null} onClose={() => { setRejectTarget(null); setRejectionReason('') }} title="Refuser la demande">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Le marchand sera notifié du refus et du motif ci-dessous — le produit « {rejectTarget?.product.name} » n&apos;est jamais touché.
          </p>
          <Textarea
            label="Motif du refus"
            rows={3}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Ex : produit encore en vente, aucune raison valable fournie..."
            maxLength={500}
          />
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => { setRejectTarget(null); setRejectionReason('') }}>Annuler</Button>
            <Button
              variant="danger"
              disabled={!rejectionReason.trim()}
              loading={resolve.isPending}
              onClick={() => rejectTarget && resolve.mutate({ id: rejectTarget.id, status: 'rejected', rejectionReason: rejectionReason.trim() })}
            >
              Refuser la demande
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
