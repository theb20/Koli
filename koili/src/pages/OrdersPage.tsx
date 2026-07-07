import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  Package, ChevronRight, Clock, Truck, CheckCircle2,
  AlertCircle, ShoppingBag, Loader2, RotateCcw,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyOrders, type ApiOrder } from '../lib/api'

/* ─── helpers ─── */
const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/* ─── Status config ─── */
type StatusKey = 'pending' | 'confirmed' | 'processing' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

const STATUS_CFG: Record<StatusKey | string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: 'En attente',      color: '#d97706', bg: '#fffbeb', icon: <Clock size={12} /> },
  confirmed:  { label: 'Confirmée',       color: '#0421ff', bg: '#eef2ff', icon: <CheckCircle2 size={12} /> },
  processing: { label: 'En traitement',   color: '#7c3aed', bg: '#f5f3ff', icon: <Package size={12} /> },
  preparing:  { label: 'En préparation',  color: '#7c3aed', bg: '#f5f3ff', icon: <Package size={12} /> },
  shipped:    { label: 'En livraison',    color: '#0891b2', bg: '#ecfeff', icon: <Truck size={12} /> },
  delivered:  { label: 'Livrée',          color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={12} /> },
  cancelled:  { label: 'Annulée',         color: '#dc2626', bg: '#fef2f2', icon: <AlertCircle size={12} /> },
  refunded:   { label: 'Remboursée',      color: '#6b7280', bg: '#f9fafb', icon: <RotateCcw size={12} /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG['pending']
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

/* ─── Order card ─── */
function OrderCard({ order }: { order: ApiOrder }) {
  const preview = order.items.slice(0, 3)
  const extra   = order.items.length - 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/commandes/${order.orderNumber}`}
        className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
      >
        {/* Header commande */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <Package size={16} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 font-mono">{order.orderNumber}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Articles */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            {preview.map((item, i) => (
              <div key={i} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border-2 border-white shrink-0 shadow-sm">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
            {extra > 0 && (
              <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gray-500">+{extra}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">
              {order.items[0]?.name}
              {order.items.length > 1 && <span className="text-gray-400"> + {order.items.length - 1} autre{order.items.length > 2 ? 's' : ''}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.items.reduce((s, i) => s + i.qty, 0)} article{order.items.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-base font-bold text-gray-900 shrink-0">{fmt(order.total)}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {order.deliveryMethod === 'express' ? '⚡ Express · 24–48h' : '📦 Standard · 3–5 jours'}
          </span>
          <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors flex items-center gap-1">
            Voir le détail <ChevronRight size={11} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

/* ─── Filters ─── */
const FILTERS: { label: string; value: string }[] = [
  { label: 'Toutes',       value: '' },
  { label: 'En attente',   value: 'pending' },
  { label: 'En cours',     value: 'confirmed' },
  { label: 'En livraison', value: 'shipped' },
  { label: 'Livrées',      value: 'delivered' },
  { label: 'Annulées',     value: 'cancelled' },
]

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function OrdersPage() {
  const { token } = useAuth()
  const [page,   setPage]   = useState(1)
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page, filter],
    queryFn: () => fetchMyOrders(token!, page),
    enabled: !!token,
    staleTime: 30_000,
  })

  const orders: ApiOrder[] = (data?.data?.orders ?? []).filter(
    o => !filter || o.status === filter
  )
  const total = data?.data?.pagination?.total ?? 0
  const totalPages = data?.data?.pagination?.totalPages ?? 1

  return (
    <>
      <PageMeta
        title="Mes commandes — Koli"
        description="Suivez l'état de toutes vos commandes Koli"
        path="/commandes"
        noIndex
      />

      <div className="min-h-screen bg-gray-50/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Package size={22} className="text-gray-400" />
              Mes commandes
            </h1>
            {total > 0 && (
              <p className="text-sm text-gray-400 mt-1">{total} commande{total > 1 ? 's' : ''} au total</p>
            )}
          </motion.div>

          {/* Filtres */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  filter === f.value
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-800'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center gap-5 py-20"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag size={32} className="text-gray-300" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {filter ? 'Aucune commande avec ce filtre' : 'Aucune commande pour l\'instant'}
                </p>
                <p className="text-sm text-gray-400 mt-1.5 max-w-xs">
                  {filter
                    ? 'Essayez un autre filtre ou consultez toutes vos commandes.'
                    : 'Vos commandes apparaîtront ici une fois votre premier achat effectué.'}
                </p>
              </div>
              <Link to="/catalogue"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                Découvrir le catalogue <ChevronRight size={15} />
              </Link>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <div className="space-y-3">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 disabled:opacity-40 transition-colors">
                ← Précédent
              </button>
              <span className="text-sm text-gray-500 px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 disabled:opacity-40 transition-colors">
                Suivant →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
