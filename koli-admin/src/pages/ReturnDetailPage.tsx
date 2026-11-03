import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Package, CheckCircle2, XCircle, Truck, Banknote,
  Image as ImageIcon, MessageSquare, Upload, AlertTriangle, Store,
} from 'lucide-react'
import { api, fmt, fmtDateTime } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea, Select } from '../components/ui/Input'
import type { OrderReturn } from '../types'

const REASON_LABELS: Record<string, string> = {
  defective:        'Article défectueux',
  wrong_item:       'Mauvais article reçu',
  not_as_described: 'Ne correspond pas à la description',
  no_longer_needed: "N'en a plus besoin",
  other:             'Autre',
}

const REFUND_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money (Orange/MTN/Wave)' },
  { value: 'bank',         label: 'Virement bancaire' },
  { value: 'store_credit', label: 'Avoir / crédit boutique' },
  { value: 'cash',         label: 'Espèces' },
]

export default function ReturnDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [adminNotes, setAdminNotes]           = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm]   = useState(false)
  const [refundAmount, setRefundAmount]       = useState('')
  const [refundMethod, setRefundMethod]       = useState('mobile_money')
  const [proofUrl, setProofUrl]               = useState('')
  const [uploadingProof, setUploadingProof]   = useState(false)
  const [uploadError, setUploadError]         = useState('')

  const { data: ret, isLoading } = useQuery({
    queryKey: ['return', id],
    queryFn:  async () => { const { data } = await api.get(`/api/returns/${id}`); return data.data as OrderReturn },
  })

  const transition = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/api/returns/${id}/status`, { adminNotes: adminNotes || undefined, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['return', id] })
      qc.invalidateQueries({ queryKey: ['returns'] })
      setShowRejectForm(false)
      setRejectionReason('')
    },
  })

  async function uploadProof(file: File) {
    setUploadError('')
    setUploadingProof(true)
    try {
      const fd = new FormData()
      fd.append('images', file)
      const { data } = await api.post('/api/returns/upload-images', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProofUrl(data.data.urls[0])
    } catch {
      setUploadError("Échec de l'upload — réessaie")
    } finally {
      setUploadingProof(false)
    }
  }

  if (isLoading || !ret) {
    return <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
  }

  const maxRefundable = ret.refundAmount ?? ret.items.reduce((s, it) => s + it.orderItem.price * it.quantity, 0)
  const photos: string[] = ret.photos ? JSON.parse(ret.photos) : []

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/returns')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">Retour · {ret.order.orderNumber}</h1>
            <Badge label={ret.status} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Demandé par {ret.order.clientPrenom} · {fmtDateTime(ret.requestedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Package size={15} className="text-indigo-500" /> Articles retournés
            </h3>
            <div className="divide-y divide-slate-100">
              {ret.items.map(it => (
                <div key={it.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{it.orderItem.name}</p>
                    <p className="text-xs text-slate-500">Quantité retournée : {it.quantity} / {it.orderItem.qty} achetée(s)</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{fmt(it.orderItem.price * it.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-600">Motif : <strong>{REASON_LABELS[ret.reason] ?? ret.reason}</strong></span>
              <span className="text-sm font-semibold text-slate-900">Max remboursable : {fmt(maxRefundable)}</span>
            </div>
            {ret.customerComment && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Commentaire client</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{ret.customerComment}</p>
              </div>
            )}
            {photos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={13} /> Photos jointes
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {ret.rejectionReason && (
            <Card className="p-5 border-red-200 bg-red-50/30">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <XCircle size={15} className="text-red-600" /> Motif de refus
              </h3>
              <p className="text-sm text-slate-700">{ret.rejectionReason}</p>
            </Card>
          )}

          {ret.status === 'refunded' && (
            <Card className="p-5 border-green-200 bg-green-50/30">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Banknote size={15} className="text-green-600" /> Remboursement effectué
              </h3>
              <p className="text-sm text-slate-700">{fmt(ret.refundAmount ?? 0)} · {ret.refundMethod === 'geniuspay' ? 'GeniusPay (confirmé auto)' : ret.refundMethod ?? '—'} · {ret.refundedAt && fmtDateTime(ret.refundedAt)}</p>
              {ret.proofUrl && (
                <a href={ret.proofUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block rounded-xl overflow-hidden border border-green-200 w-32">
                  <img src={ret.proofUrl} alt="Preuve du remboursement" className="w-full aspect-square object-cover" />
                </a>
              )}
              {!ret.proofUrl && (
                <p className="mt-2 text-xs text-slate-500">Aucune preuve jointe — remboursement confirmé automatiquement par GeniusPay.</p>
              )}
            </Card>
          )}

          {(ret.merchantComment || ret.merchantDamaged !== null && ret.merchantDamaged !== undefined) && (
            <Card className="p-5 border-amber-200 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Store size={15} className="text-amber-600" /> Constat du marchand
              </h3>
              {ret.merchantDamaged !== null && ret.merchantDamaged !== undefined && (
                <p className="text-sm text-slate-700 flex items-center gap-1.5">
                  {ret.merchantDamaged
                    ? <><AlertTriangle size={13} className="text-red-500" /> Article signalé endommagé</>
                    : <><CheckCircle2 size={13} className="text-green-600" /> Article signalé non endommagé</>}
                </p>
              )}
              {ret.merchantComment && <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-line">{ret.merchantComment}</p>}
              {ret.merchantCommentedAt && <p className="text-xs text-slate-400 mt-1.5">{fmtDateTime(ret.merchantCommentedAt)}</p>}
            </Card>
          )}

          {/* Actions selon le statut courant */}
          {(ret.status === 'requested' || ret.status === 'approved' || ret.status === 'received') && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MessageSquare size={15} className="text-indigo-500" /> Traiter la demande
              </h3>
              <Textarea
                label="Note interne — optionnelle"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="Note visible uniquement par l'équipe admin"
                className="mb-4"
              />

              {showRejectForm ? (
                <div className="space-y-3">
                  <Textarea
                    label="Motif du refus (envoyé au client)"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Ex : article reçu hors délai, aucune preuve de défaut..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowRejectForm(false)}>Annuler</Button>
                    <Button variant="danger" icon={<XCircle size={14} />} loading={transition.isPending}
                      disabled={rejectionReason.trim().length < 3}
                      onClick={() => transition.mutate({ status: 'rejected', rejectionReason })}>
                      Confirmer le refus
                    </Button>
                  </div>
                </div>
              ) : ret.status === 'received' ? (
                <div className="space-y-3">
                  <Input
                    label={`Montant à rembourser (max ${fmt(maxRefundable)})`}
                    type="number" min={0} max={maxRefundable}
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    placeholder={String(maxRefundable)}
                  />
                  <Select
                    label="Méthode de remboursement"
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value)}
                    options={REFUND_METHODS}
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Preuve du remboursement (capture/reçu) — obligatoire
                    </label>
                    {proofUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={proofUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                        <Button variant="secondary" onClick={() => setProofUrl('')}>Remplacer</Button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 text-sm text-slate-600 border border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-colors w-fit">
                        <Upload size={14} />
                        {uploadingProof ? 'Envoi en cours…' : 'Choisir une image'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingProof}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f) }} />
                      </label>
                    )}
                    {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" onClick={() => setShowRejectForm(true)}>Refuser</Button>
                    <Button variant="success" icon={<Banknote size={14} />} loading={transition.isPending}
                      disabled={!proofUrl}
                      onClick={() => transition.mutate({
                        status: 'refunded',
                        refundAmount: refundAmount ? Number(refundAmount) : undefined,
                        refundMethod,
                        proofUrl,
                      })}>
                      Rembourser
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowRejectForm(true)}>Refuser</Button>
                  {ret.status === 'requested' && (
                    <Button variant="primary" icon={<CheckCircle2 size={14} />} loading={transition.isPending}
                      onClick={() => transition.mutate({ status: 'approved' })}>
                      Approuver
                    </Button>
                  )}
                  {ret.status === 'approved' && (
                    <Button variant="primary" icon={<Truck size={14} />} loading={transition.isPending}
                      onClick={() => transition.mutate({ status: 'received' })}>
                      Marquer comme reçu
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statut</h3>
            <Badge label={ret.status} />
            <div className="mt-3 space-y-1.5 text-xs text-slate-500">
              <p>Demandé le {fmtDateTime(ret.requestedAt)}</p>
              {ret.approvedAt  && <p>Approuvé le {fmtDateTime(ret.approvedAt)}</p>}
              {ret.receivedAt  && <p>Reçu le {fmtDateTime(ret.receivedAt)}</p>}
              {ret.refundedAt  && <p>Remboursé le {fmtDateTime(ret.refundedAt)}</p>}
              {ret.rejectedAt  && <p>Refusé le {fmtDateTime(ret.rejectedAt)}</p>}
              {ret.cancelledAt && <p>Annulé le {fmtDateTime(ret.cancelledAt)}</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Client</h3>
            <p className="text-sm font-medium text-slate-900">{ret.order.clientPrenom}</p>
            <a href={`mailto:${ret.order.clientEmail}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 mt-2">
              <Mail size={13} className="text-slate-400" /> {ret.order.clientEmail}
            </a>
            <button onClick={() => navigate(`/orders/${ret.orderId}`)}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Voir la commande {ret.order.orderNumber} →
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
