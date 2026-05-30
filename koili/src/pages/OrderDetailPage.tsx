import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
  ChevronRight, Package, Truck, CheckCircle2, Clock, MapPin,
  Phone, MessageSquare, RotateCcw, Download, Copy, Check,
  Star, AlertCircle, CreditCard, ShieldCheck, ChevronDown,
  Loader2,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useAuth } from '../contexts/AuthContext'
import { fetchOrder, apiFetch, type ApiOrder, type ApiResponse } from '../lib/api'

/* ═══════════════════════════════════════════════════════════════
   TYPES & HELPERS
═══════════════════════════════════════════════════════════════ */
const fmt = (n: number) =>
  Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

type OrderItem = {
  productId: number; name: string; brand: string; image: string
  price: number; oldPrice?: number; qty: number; color?: string
}

type Order = {
  id: string; date: string; status: OrderStatus
  items: OrderItem[]
  shipping: { name: string; address: string; city: string; phone: string }
  payment: { method: string; ref: string }
  shippingCost: number; subtotal: number; promoDiscount: number
  taxRate: number; taxAmount: number
  total: number
  trackingNumber?: string; estimatedDelivery?: string
}

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money', mtn: 'MTN Mobile Money', wave: 'Wave', cash: 'Paiement à la livraison',
}

function mapOrder(o: ApiOrder): Order {
  let addr: { ville?: string; quartier?: string; adresse?: string } = {}
  try { addr = JSON.parse(o.shippingAddress) } catch { /* ignore */ }
  return {
    id:           o.orderNumber,
    date:         new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    status:       (o.status as OrderStatus) ?? 'pending',
    trackingNumber:    o.trackingNumber ?? undefined,
    estimatedDelivery: o.estimatedDelivery
      ? new Date(o.estimatedDelivery).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : undefined,
    items: o.items.map(i => ({
      productId: i.productId, name: i.name, brand: i.brand,
      image: i.image, price: i.price, qty: i.qty, color: i.color ?? undefined,
    })),
    shipping: {
      name:    `${o.clientPrenom} ${o.clientNom}`,
      address: [addr.adresse, addr.quartier].filter(Boolean).join(', '),
      city:    addr.ville ?? '',
      phone:   o.clientTelephone,
    },
    payment:      { method: PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod, ref: o.orderNumber },
    shippingCost: o.shippingCost,
    subtotal:     o.subtotal,
    promoDiscount: o.promoDiscount,
    taxRate:      o.taxRate ?? 0,
    taxAmount:    o.taxAmount ?? 0,
    total:        o.total,
  }
}

/* ─── Status config ─── */
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente',      color: '#d97706', bg: '#fffbeb', icon: <Clock size={14} /> },
  confirmed: { label: 'Confirmée',       color: '#0421ff', bg: '#eef2ff', icon: <CheckCircle2 size={14} /> },
  preparing: { label: 'En préparation',  color: '#7c3aed', bg: '#f5f3ff', icon: <Package size={14} /> },
  shipped:   { label: 'Expédiée',        color: '#0891b2', bg: '#ecfeff', icon: <Truck size={14} /> },
  delivered: { label: 'Livrée',          color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={14} /> },
  cancelled: { label: 'Annulée',         color: '#dc2626', bg: '#fef2f2', icon: <AlertCircle size={14} /> },
}

/* ─── Timeline steps ─── */
const TIMELINE_STEPS: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'pending',   label: 'Commande reçue',     desc: 'Votre commande a été enregistrée',              icon: <Clock size={15} /> },
  { key: 'confirmed', label: 'Confirmée',           desc: 'Paiement validé, traitement en cours',          icon: <CheckCircle2 size={15} /> },
  { key: 'preparing', label: 'En préparation',      desc: 'Vos articles sont en cours de préparation',     icon: <Package size={15} /> },
  { key: 'shipped',   label: 'Expédiée',            desc: 'Votre colis est en route',                      icon: <Truck size={15} /> },
  { key: 'delivered', label: 'Livrée',              desc: 'Commande livrée avec succès',                   icon: <CheckCircle2 size={15} /> },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered']

/* ═══════════════════════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════════════════════ */
function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
        <AlertCircle size={20} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">Commande annulée</p>
          <p className="text-xs text-red-400 mt-0.5">Cette commande a été annulée. Remboursement sous 3-5 jours ouvrés.</p>
        </div>
      </div>
    )
  }

  const currentIdx = STATUS_ORDER.indexOf(status)

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-gray-100" />

      <div className="space-y-0">
        {TIMELINE_STEPS.map((step, i) => {
          const done   = i < currentIdx
          const active = i === currentIdx

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="flex items-start gap-4 relative pb-6 last:pb-0"
            >
              {/* Dot */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative z-10 ${
                done    ? 'bg-emerald-500 border-emerald-500 text-white' :
                active  ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]' :
                          'bg-white border-gray-200 text-gray-300'
              }`}>
                {step.icon}
                {done && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check size={15} strokeWidth={2.5} className="text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <p className={`text-sm font-semibold ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className={`text-xs mt-0.5 leading-relaxed ${
                  active ? 'text-blue-600 font-medium' : done ? 'text-gray-400' : 'text-gray-300'
                }`}>
                  {step.desc}
                </p>
                {active && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    En cours…
                  </span>
                )}
              </div>

              {/* Date (fake) */}
              {(done || active) && (
                <span className="text-[11px] text-gray-400 font-mono shrink-0 pt-1.5">
                  {['10/05', '11/05', '12/05', '13/05', '14/05'][i]}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER ITEM ROW
═══════════════════════════════════════════════════════════════ */
function OrderItemRow({ item }: { item: OrderItem }) {
  const d = item.oldPrice
    ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
    : 0

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
      <Link to={`/catalogue/${item.productId}`} className="shrink-0">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{item.brand}</p>
        <Link to={`/catalogue/${item.productId}`}>
          <p className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors">
            {item.name}
          </p>
        </Link>
        {item.color && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ background: item.color }} />
            <span className="text-[11px] text-gray-400">Couleur</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-500">Qté : <strong className="text-gray-800">{item.qty}</strong></span>
          {d > 0 && (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{d}%</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-gray-900">{fmt(item.price * item.qty)}</p>
        {item.qty > 1 && (
          <p className="text-[11px] text-gray-400 mt-0.5">{fmt(item.price)} / unité</p>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION CARD wrapper
═══════════════════════════════════════════════════════════════ */
function Card({ title, icon, children, className = '' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [copiedRef, setCopiedRef]     = useState(false)
  const [copiedTrack, setCopiedTrack] = useState(false)
  const [ratingOpen, setRatingOpen]   = useState(false)
  const [stars, setStars]             = useState(0)
  const [showCancel, setShowCancel]   = useState(false)

  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => fetchOrder(id!, token),
    enabled:  !!id,
    retry:    false,
  })

  const handleCancel = async () => {
    if (!id) return
    setCancelling(true)
    setCancelError('')
    try {
      await apiFetch<ApiResponse<unknown>>(
        `/api/orders/${encodeURIComponent(id)}/cancel`,
        token,
        { method: 'PUT' },
      )
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      setShowCancel(false)
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
    }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  /* ── 404 / Error ── */
  if (isError || !data?.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-6xl">📦</p>
        <p className="text-xl font-bold text-gray-900">Commande introuvable</p>
        <p className="text-sm text-gray-400">Cette commande n'existe pas ou vous n'y avez pas accès.</p>
        <Link to="/profil"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition">
          Mes commandes
        </Link>
      </div>
    )
  }

  const order      = mapOrder(data.data)
  const statusCfg  = STATUS_CONFIG[order.status]
  const canCancel  = order.status === 'pending'
  const canReturn  = order.status === 'delivered'

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <>
      <PageMeta
        title={`Commande ${order.id}`}
        description={`Suivi de votre commande ${order.id} — ${order.items.length} article${order.items.length > 1 ? 's' : ''}`}
        path={`/commandes/${order.id}`}
        noIndex
      />

      <div className="min-h-screen bg-gray-50/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">

          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
            <Link to="/" className="hover:text-gray-700 transition-colors">Accueil</Link>
            <ChevronRight size={12} />
            <Link to="/commandes" className="hover:text-gray-700 transition-colors">Mes commandes</Link>
            <ChevronRight size={12} />
            <span className="text-gray-600 font-medium">{order.id}</span>
          </nav>

          {/* ── Page header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Commande {order.id}
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ color: statusCfg.color, background: statusCfg.bg }}
                >
                  {statusCfg.icon}
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Passée le {order.date} · {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors">
                <Download size={14} />
                Facture PDF
              </button>
              {canCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Annuler
                </button>
              )}
              {canReturn && (
                <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors">
                  <RotateCcw size={14} />
                  Retourner
                </button>
              )}
            </div>
          </motion.div>

          {/* ── Main grid ── */}
          <div className="grid lg:grid-cols-3 gap-5">

            {/* ══ Colonne gauche (2/3) ══ */}
            <div className="lg:col-span-2 space-y-5">

              {/* Suivi de statut */}
              <Card title="Suivi de commande" icon={<Truck size={16} />}>
                {order.trackingNumber && (
                  <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <MapPin size={14} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-semibold">Numéro de suivi</p>
                      <p className="text-sm font-mono font-bold text-blue-800 mt-0.5">{order.trackingNumber}</p>
                    </div>
                    <button
                      onClick={() => copy(order.trackingNumber!, setCopiedTrack)}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      {copiedTrack ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
                {order.estimatedDelivery && order.status !== 'delivered' && (
                  <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
                    <Clock size={13} className="text-amber-500" />
                    Livraison estimée le <strong className="text-gray-800 ml-1">{order.estimatedDelivery}</strong>
                  </div>
                )}
                {order.status === 'delivered' && (
                  <div className="flex items-center gap-2 mb-5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 size={13} />
                    Livrée le {order.estimatedDelivery}
                  </div>
                )}
                <OrderTimeline status={order.status} />
              </Card>

              {/* Détail articles */}
              <Card title={`Articles (${order.items.length})`} icon={<Package size={16} />}>
                <div>
                  {order.items.map(item => (
                    <OrderItemRow key={item.productId} item={item} />
                  ))}
                </div>

                {/* Laisser un avis — si livré */}
                {canReturn && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setRatingOpen(r => !r)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors w-full"
                    >
                      <Star size={15} className="text-amber-400 fill-amber-400" />
                      Donner mon avis sur cette commande
                      <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${ratingOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {ratingOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          {[1,2,3,4,5].map(i => (
                            <button key={i} onClick={() => setStars(i)} className="transition-transform hover:scale-125">
                              <Star size={24} className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                            </button>
                          ))}
                          {stars > 0 && (
                            <span className="text-sm text-gray-500 ml-2">
                              {['','Mauvais','Passable','Bien','Très bien','Excellent'][stars]}
                            </span>
                          )}
                        </div>
                        {stars > 0 && (
                          <button className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                            Envoyer mon avis
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </Card>

              {/* Adresse de livraison */}
              <Card title="Adresse de livraison" icon={<MapPin size={16} />}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.shipping.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      {order.shipping.address}<br />
                      {order.shipping.city}, Côte d'Ivoire
                    </p>
                    <a
                      href={`tel:${order.shipping.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
                    >
                      <Phone size={11} />
                      {order.shipping.phone}
                    </a>
                  </div>
                </div>
              </Card>
            </div>

            {/* ══ Colonne droite (1/3) ══ */}
            <div className="space-y-5">

              {/* Récap prix */}
              <Card title="Récapitulatif" icon={<CreditCard size={16} />}>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sous-total HT</span>
                    <span className="font-medium text-gray-800">{fmt(order.subtotal)}</span>
                  </div>
                  {order.promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Code promo</span>
                      <span className="text-emerald-600 font-semibold">−{fmt(order.promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Livraison</span>
                    <span className={order.shippingCost === 0 ? 'text-emerald-600 font-semibold' : 'font-medium text-gray-800'}>
                      {order.shippingCost === 0 ? 'Gratuite' : fmt(order.shippingCost)}
                    </span>
                  </div>
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">TVA ({order.taxRate}%)</span>
                      <span className="font-medium text-gray-800">{fmt(order.taxAmount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-gray-900">Total TTC</span>
                    <span className="text-gray-900">{fmt(order.total)}</span>
                  </div>
                  {order.taxAmount > 0 && (
                    <p className="text-[11px] text-gray-400 text-right">TVA {order.taxRate}% incluse</p>
                  )}
                </div>
              </Card>

              {/* Paiement */}
              <Card title="Paiement" icon={<ShieldCheck size={16} />}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.payment.method}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Référence paiement</p>
                    <button
                      onClick={() => copy(order.payment.ref, setCopiedRef)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {copiedRef ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      {copiedRef ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-gray-700 mt-1 break-all">{order.payment.ref}</p>
                </div>
              </Card>

              {/* Support */}
              <Card title="Besoin d'aide ?" icon={<MessageSquare size={16} />}>
                <div className="space-y-2.5">
                  <a
                    href="https://wa.me/2250700000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                      <MessageSquare size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">WhatsApp SAV</p>
                      <p className="text-xs text-gray-400">Réponse en &lt; 1h</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                  </a>

                  <a
                    href="tel:+2250700000000"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <Phone size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Appeler le SAV</p>
                      <p className="text-xs text-gray-400">7j/7 — 8h à 20h</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                  </a>
                </div>
              </Card>

              {/* Produits similaires CTA */}
              <Link
                to="/catalogue"
                className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 transition-colors group"
              >
                <div>
                  <p className="text-sm font-bold">Continuer mes achats</p>
                  <p className="text-xs text-white/50 mt-0.5">Explorer le catalogue complet</p>
                </div>
                <ChevronRight size={18} className="text-white/50 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal annulation ── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center">Annuler la commande ?</h3>
            <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
              Cette action est irréversible. Le remboursement sera effectué sous 3 à 5 jours ouvrés via le même moyen de paiement.
            </p>
            {cancelError && (
              <p className="text-sm text-red-500 text-center mt-3 bg-red-50 rounded-lg px-3 py-2">{cancelError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCancel(false); setCancelError('') }}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Garder la commande
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : null}
                {cancelling ? 'Annulation…' : 'Confirmer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
