import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Phone, MapPin, Package, Calendar, BadgeCent,
  Box, Send, CheckCircle2, Trash2, Image as ImageIcon, ShoppingBag,
  Link2, Copy, Check, Clock, XCircle, History,
} from 'lucide-react'
import { api, fmt, fmtDateTime } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea, Select } from '../components/ui/Input'
import { Confirm } from '../components/ui/Modal'
import type { ProductRequest, ProductRequestStatus, ProductRequestHistoryItem } from '../types'

const STATUS_OPTIONS: { value: ProductRequestStatus; label: string }[] = [
  { value: 'new',        label: 'Nouvelle' },
  { value: 'processing', label: 'En cours' },
  { value: 'quoted',     label: 'Devis envoyé' },
  { value: 'fulfilled',  label: 'Traitée' },
  { value: 'rejected',   label: 'Refusée' },
  { value: 'cancelled',  label: 'Annulée' },
]

/** Statuts posés par le client ou la passerelle — affichés, jamais choisis à la main */
const CLIENT_STATUS_LABELS: Partial<Record<ProductRequestStatus, string>> = {
  accepted: 'Acceptée · paiement en attente',
  paid:     'Payée par le client',
  declined: 'Refusée par le client',
}

export default function ProductRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [replyMessage, setReplyMessage] = useState('')
  const [quotedPrice, setQuotedPrice]   = useState('')
  const [replySent, setReplySent]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied]             = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['product-request', id],
    queryFn:  async () => {
      const { data } = await api.get(`/api/product-requests/${id}`)
      return data.data as { request: ProductRequest; history: ProductRequestHistoryItem[] }
    },
  })
  const request = data?.request
  const history = data?.history ?? []

  const statusMutation = useMutation({
    mutationFn: (status: ProductRequestStatus) => api.patch(`/api/product-requests/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-request', id] }),
  })
  const statusErrorMessage = (statusMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/api/product-requests/${id}/reply`, {
      message: replyMessage.trim(),
      quotedPrice: quotedPrice ? Number(quotedPrice) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-request', id] })
      setReplySent(true)
      setReplyMessage('')
      setQuotedPrice('')
      setTimeout(() => setReplySent(false), 4000)
    },
  })

  // Mêmes règles que le serveur (replySchema) — bloquer l'envoi plutôt que
  // de laisser partir une requête qui reviendra en 400.
  const trimmedReply = replyMessage.trim()
  const priceNumber  = quotedPrice === '' ? null : Number(quotedPrice)
  const replyError =
    trimmedReply.length > 0 && trimmedReply.length < 5 ? 'Le message doit contenir au moins 5 caractères.'
    : trimmedReply.length > 3000                          ? 'Le message ne doit pas dépasser 3000 caractères.'
    : priceNumber !== null && (!Number.isInteger(priceNumber) || priceNumber <= 0)
      ? 'Le prix doit être un nombre entier positif, sans virgule ni espace (ex : 45000).'
    : null
  const replyServerError = (() => {
    const data = (replyMutation.error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
    const fieldErrors = data?.errors ? Object.values(data.errors).flat().join(' ') : ''
    return [data?.message, fieldErrors].filter(Boolean).join(' — ') || "Erreur lors de l'envoi"
  })()

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/product-requests/${id}`),
    onSuccess: () => navigate('/product-requests'),
    onError: (err) => {
      // 404 = déjà supprimée (double-clic, liste obsolète) — l'état voulu est
      // déjà atteint, on quitte la page comme si la suppression avait réussi.
      if ((err as { response?: { status?: number } }).response?.status === 404) {
        navigate('/product-requests')
      }
    },
  })

  if (isLoading || !request) {
    return <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
  }

  const statusOptions = CLIENT_STATUS_LABELS[request.status]
    ? [{ value: request.status, label: CLIENT_STATUS_LABELS[request.status]! }, ...STATUS_OPTIONS]
    : STATUS_OPTIONS
  const copyQuoteLink = () => {
    if (!request.quoteUrl) return
    navigator.clipboard.writeText(request.quoteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/product-requests')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{request.productName}</h1>
            <Badge label={request.expired ? 'expired' : request.status} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Demande de {request.clientPrenom} {request.clientNom} · {fmtDateTime(request.createdAt)}</p>
        </div>
        <button onClick={() => setConfirmDelete(true)}
          className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Supprimer">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Package size={15} className="text-indigo-500" /> Description
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{request.description}</p>

            {request.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {request.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-slate-400" />
                <span className="text-sm text-slate-600">Quantité : <strong>{request.quantity ?? '—'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCent size={14} className="text-slate-400" />
                <span className="text-sm text-slate-600">Budget : <strong>{request.budget ? fmt(request.budget) : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <MapPin size={14} className="text-slate-400" />
                <span className="text-sm text-slate-600">{request.deliveryAddress}</span>
              </div>
              {request.desiredDate && (
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Souhaitée pour le {fmtDateTime(request.desiredDate).split(' ')[0]}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Historique de réponse */}
          {request.adminReply && (
            <Card className="p-5 border-green-200 bg-green-50/30">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-green-600" /> Réponse envoyée {request.repliedAt && `· ${fmtDateTime(request.repliedAt)}`}
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{request.adminReply}</p>
              {request.quotedPrice && (
                <p className="text-sm font-bold text-indigo-600 mt-2">
                  Prix proposé : {fmt(request.quotedPrice)} / unité
                  {(request.quantity ?? 1) > 1 && <span className="font-normal text-slate-500"> × {request.quantity}</span>}
                </p>
              )}
            </Card>
          )}

          {/* Répondre */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Send size={15} className="text-indigo-500" /> {request.adminReply ? 'Envoyer une nouvelle réponse' : 'Répondre au client'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ce message part directement dans la boîte mail de <strong>{request.clientEmail}</strong>.
            </p>
            <div className="space-y-3">
              <Textarea
                label="Message"
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                rows={5}
                placeholder="Bonjour, nous avons trouvé votre produit auprès d'un fournisseur fiable..."
              />
              <Input
                label="Prix unitaire proposé (F CFA, livraison incluse) — optionnel"
                type="number"
                min={1}
                value={quotedPrice}
                onChange={e => setQuotedPrice(e.target.value)}
                placeholder="45000"
              />
              <p className="text-xs text-slate-500 -mt-1">
                Avec un prix, le client reçoit un <strong>devis en ligne valable 7 jours</strong> (e-mail + SMS) qu'il peut accepter
                et payer en ligne, ou refuser. Le total facturé = prix × quantité ({request.quantity ?? 1}) + TVA — la livraison n'est pas ajoutée.
              </p>
              <div className="flex justify-end items-center gap-3">
                {replySent && <span className="text-green-600 text-sm font-medium">✓ Réponse envoyée par email</span>}
                {replyError && <span className="text-amber-600 text-sm font-medium">{replyError}</span>}
                {!replyError && replyMutation.isError && <span className="text-red-600 text-sm font-medium">{replyServerError}</span>}
                <Button
                  onClick={() => replyMutation.mutate()}
                  loading={replyMutation.isPending}
                  disabled={!trimmedReply || !!replyError}
                  icon={<Send size={14} />}
                >
                  Envoyer par email
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statut</h3>
            <Select
              value={request.status}
              onChange={e => statusMutation.mutate(e.target.value as ProductRequestStatus)}
              options={statusOptions}
            />
            {statusMutation.isError && (
              <p className="text-xs text-red-600 mt-2">{statusErrorMessage ?? 'Erreur lors du changement de statut'}</p>
            )}
          </Card>

          {/* Suivi du devis en ligne */}
          {request.quoteUrl && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Link2 size={15} className="text-indigo-500" /> Devis en ligne
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                {request.quoteExpiresAt && (
                  <p className="flex items-center gap-1.5">
                    <Clock size={12} className={request.expired ? 'text-amber-500' : 'text-slate-400'} />
                    {request.expired ? 'Expiré le ' : "Valable jusqu'au "}{fmtDateTime(request.quoteExpiresAt)}
                  </p>
                )}
                {request.status === 'declined' && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <XCircle size={12} /> Refusé par le client {request.decidedAt && `· ${fmtDateTime(request.decidedAt)}`}
                    </p>
                    <p className="mt-1 text-slate-500">{request.declineReason || 'Aucun motif indiqué'}</p>
                  </div>
                )}
                {request.expired && (
                  <p className="text-amber-700">Renvoyez une réponse avec un prix pour prolonger le devis de 7 jours.</p>
                )}
              </div>
              <button onClick={copyQuoteLink}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 transition-colors">
                {copied ? <><Check size={12} /> Lien copié</> : <><Copy size={12} /> Copier le lien du devis</>}
              </button>
            </Card>
          )}

          {request.order && request.orderId && (
            <Card className={`p-5 ${request.order.paymentStatus === 'paid' ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <ShoppingBag size={15} className={request.order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'} />
                Commande {request.order.orderNumber}
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                {request.order.paymentStatus === 'paid'
                  ? `Payée en ligne (${fmt(request.order.total)}) — vous pouvez lancer l'achat.`
                  : request.order.status === 'cancelled'
                    ? 'Paiement annulé ou échoué — le client peut réessayer depuis son devis.'
                    : `Devis accepté, en attente du paiement (${fmt(request.order.total)}).`}
              </p>
              <Button onClick={() => navigate(`/orders/${request.orderId}`)} icon={<ShoppingBag size={14} />}>
                Voir la commande
              </Button>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Client</h3>
            <p className="text-sm font-medium text-slate-900">{request.clientPrenom} {request.clientNom}</p>
            <div className="mt-3 space-y-2">
              <a href={`mailto:${request.clientEmail}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600">
                <Mail size={13} className="text-slate-400" /> {request.clientEmail}
              </a>
              {request.clientTelephone && (
                <a href={`tel:${request.clientTelephone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600">
                  <Phone size={13} className="text-slate-400" /> {request.clientTelephone}
                </a>
              )}
            </div>
          </Card>

          {/* Historique sourcing du client */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <History size={15} className="text-indigo-500" /> Historique du client
              <span className="ml-auto text-xs font-normal text-slate-400">{history.length + 1} demande{history.length > 0 ? 's' : ''}</span>
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400">Première demande de sourcing de ce client.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <button key={h.id} onClick={() => navigate(`/product-requests/${h.id}`)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 line-clamp-1">{h.productName}</p>
                      <Badge label={h.expired ? 'expired' : h.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {fmtDateTime(h.createdAt).split(' ')[0]}
                      {h.order ? ` · ${fmt(h.order.total)}` : h.quotedPrice ? ` · ${fmt(h.quotedPrice * (h.quantity ?? 1))}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {request.images.length === 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ImageIcon size={14} /> Aucune photo jointe
              </div>
            </Card>
          )}
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Supprimer cette demande ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
