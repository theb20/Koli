import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Phone, Mail, Package, CreditCard, Lock, AlertTriangle } from 'lucide-react'
import { api, fmt, fmtDateTime } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { Order, OrderStatus } from '../../types'

const ALL_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' }, { value: 'confirmed', label: 'Confirmée' },
  { value: 'processing', label: 'En traitement' }, { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' }, { value: 'cancelled', label: 'Annulée' },
  { value: 'refunded', label: 'Remboursée' },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function OrderDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders/${id}`)
      // Le backend retourne { success: true, data: <order> }
      return data.data as Order
    },
    retry: false,
    staleTime: 30_000,
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !order) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <Package size={40} className="text-slate-200" />
      <p className="font-medium">Commande introuvable</p>
      <p className="text-sm text-slate-300">ID : <code className="font-mono text-xs">{id}</code></p>
      <button onClick={() => navigate('/orders')} className="mt-2 text-sm text-indigo-500 hover:text-indigo-600 underline">
        ← Retour aux commandes
      </button>
    </div>
  )

  const addr = (() => { try { return JSON.parse(order.shippingAddress) } catch { return null } })()
  const currentIdx = STATUS_ORDER.indexOf(order.status as OrderStatus)
  const isFrozen = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Bannière commande figée */}
      {isFrozen && (
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm font-medium ${
          order.status === 'cancelled'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-purple-50 border-purple-200 text-purple-700'
        }`}>
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {order.status === 'cancelled'
              ? 'Cette commande a été annulée. Elle est en lecture seule et ne peut plus être modifiée.'
              : 'Cette commande a été remboursée. Elle est en lecture seule et ne peut plus être modifiée.'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{order.orderNumber}</h1>
              <Badge label={order.status} />
              <Badge label={order.paymentStatus} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{fmtDateTime(order.createdAt)}</p>
          </div>
        </div>
        {/* Status update — verrouillé si annulée / remboursée */}
        {order.status === 'cancelled' || order.status === 'refunded' ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500">
            <Lock size={13} className="text-slate-400" />
            Commande {order.status === 'cancelled' ? 'annulée' : 'remboursée'} — lecture seule
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={order.status}
              onChange={e => updateStatus.mutate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {/* Ne pas permettre de sortir de cancelled/refunded depuis la liste */}
              {ALL_STATUSES.filter(s => s.value !== 'cancelled' || order.status === 'cancelled')
                .map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button loading={updateStatus.isPending} size="sm" onClick={() => {}}>
              {updateStatus.isPending ? 'Mise à jour...' : ''}
            </Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      {order.status !== 'cancelled' && order.status !== 'refunded' && (
        <Card className="p-5">
          <div className="flex items-center gap-0">
            {STATUS_ORDER.map((s, i) => {
              const done   = currentIdx >= i
              const active = currentIdx === i
              return (
                <div key={s} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'} ${active ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] font-medium ${done ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {ALL_STATUSES.find(x => x.value === s)?.label}
                    </p>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${currentIdx > i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Articles commandés</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {order.items?.map(item => (
                <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    {item.color && <p className="text-xs text-slate-500">Couleur: {item.color}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{fmt(item.price * item.qty)}</p>
                    <p className="text-xs text-slate-500">{fmt(item.price)} × {item.qty}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totaux */}
            <div className="px-5 py-4 border-t border-slate-100 space-y-2 bg-slate-50 rounded-b-2xl">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Sous-total</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
              {order.promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Réduction {order.promoCode && `(${order.promoCode})`}</span>
                  <span>- {fmt(order.promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-500">
                <span>Livraison ({order.deliveryMethod})</span>
                <span>{order.shippingCost === 0 ? 'Gratuite' : fmt(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          {/* Client */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Mail size={14} className="text-slate-400" /> Client
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{order.clientPrenom} {order.clientNom}</p>
              <p className="text-slate-500">{order.clientEmail}</p>
              <p className="text-slate-500 flex items-center gap-1.5">
                <Phone size={12} className="text-slate-400" />{order.clientTelephone}
              </p>
            </div>
          </Card>

          {/* Livraison */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-slate-400" /> Adresse de livraison
            </h3>
            {addr ? (
              <div className="text-sm text-slate-500 space-y-1">
                <p className="font-medium text-slate-900">{addr.ville}</p>
                {addr.quartier && <p>{addr.quartier}</p>}
                <p>{addr.adresse}</p>
                {addr.instructions && <p className="text-slate-400 italic text-xs mt-2">{addr.instructions}</p>}
              </div>
            ) : <p className="text-xs text-slate-400">{order.shippingAddress}</p>}
          </Card>

          {/* Paiement */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-slate-400" /> Paiement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Méthode</span>
                <span className="text-slate-900 capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statut</span>
                <Badge label={order.paymentStatus} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Livraison</span>
                <span className="text-slate-900 capitalize">{order.deliveryMethod}</span>
              </div>
            </div>
          </Card>

          {order.notes && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-500 italic">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
