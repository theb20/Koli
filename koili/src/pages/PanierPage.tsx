import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  ShoppingCart, ChevronRight, ChevronLeft, Trash2, Plus, Minus,
  MapPin, Phone, User, Tag, CreditCard, Smartphone, Banknote,
  CheckCircle2, Package, Shield, Truck, Clock, Copy, Check,
  ArrowLeft, AlertCircle, Edit2, Star, Zap, Gift, Info,
  MessageCircle, RotateCcw, Mail, Loader2, Undo2, Lock, Van,
} from 'lucide-react'
import { useCart, fmtCart, type CartItem } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { createOrder, fetchPromo, fetchProducts, fetchProduct, mapApiProduct, fetchDefaultTax } from '../lib/api'
import { useSiteSettings, waLink, telLink } from '../hooks/useSiteSettings'

/* ═══════════════════════════════════════════════════════════════
   TYPES & CONSTANTES
═══════════════════════════════════════════════════════════════ */
type Step = 'cart' | 'livraison' | 'paiement' | 'confirmation' | 'succes'

type DeliveryInfo = {
  prenom: string; nom: string; email: string; telephone: string
  ville: string; quartier: string; adresse: string; notes: string
  methode: 'standard' | 'express'
}

type PaymentMethod = 'orange' | 'wave' | 'mtn' | 'cash'

const SHIPPING_FREE   = 25_000  // 25 000 FCFA
const SHIPPING_STD    = 1_500   // 1 500 FCFA
const SHIPPING_EXP    = 3_500   // 3 500 FCFA

const STEPS_LIST: { id: Step; label: string; icon: string }[] = [
  { id: 'cart',         label: 'Panier',       icon: '🛒' },
  { id: 'livraison',    label: 'Livraison',    icon: '📦' },
  { id: 'paiement',     label: 'Paiement',     icon: '💳' },
  { id: 'confirmation', label: 'Confirmation', icon: '✅' },
]

const STEP_ORDER: Step[] = ['cart', 'livraison', 'paiement', 'confirmation', 'succes']

const PAYMENT_OPTIONS = [
  { id: 'orange' as PaymentMethod, label: 'Orange Money',        desc: 'Paiement mobile sécurisé', logo: 'https://www.wakatsera.com/wp-content/uploads/2018/09/logo-Orange.png',   bg: 'bg-orange-50', border: 'border-orange-300', ring: 'ring-orange-200', badge: 'text-orange-700 bg-orange-100' },
  { id: 'wave'   as PaymentMethod, label: 'Wave',                desc: 'Transfert instantané',     logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm9rYPURKIok7K0ZF22oqFgMbzIHgNCauVQA&s',     bg: 'bg-blue-50',   border: 'border-blue-300',   ring: 'ring-blue-200',   badge: 'text-blue-700 bg-blue-100'   },
  { id: 'mtn'    as PaymentMethod, label: 'MTN Mobile Money',    desc: 'Paiement MoMo fiable',     logo: 'https://portal.powertec.com.au/sites/default/files/styles/scale_square/public/2023-11/MTN-logo.jpg.webp?itok=IMHSWZxT',      bg: 'bg-yellow-50', border: 'border-yellow-300', ring: 'ring-yellow-200', badge: 'text-yellow-700 bg-yellow-100' },
  { id: 'cash'   as PaymentMethod, 
    label: 'Cash à la livraison', 
    desc: 'Payer à réception',        
    logo: 'https://png.pngtree.com/png-clipart/20210606/original/pngtree-cash-on-delivery-illustration-png-image_6376752.jpg', 
    bg: 'bg-green-50',  
    border: 'border-green-300',  
    ring: 'ring-green-200',  
    badge: 'text-green-700 bg-green-100'  
  },
]

/* ── Côte d'Ivoire : communes d'Abidjan + villes principales ── */
const VILLES_CI = {
  'Abidjan — Communes': [
    'Abidjan – Abobo',
    'Abidjan – Adjamé',
    'Abidjan – Attécoubé',
    'Abidjan – Cocody',
    'Abidjan – Koumassi',
    'Abidjan – Marcory',
    'Abidjan – Plateau',
    'Abidjan – Port-Bouët',
    'Abidjan – Treichville',
    'Abidjan – Yopougon',
    'Abidjan – Bingerville',
    'Abidjan – Anyama',
    'Abidjan – Songon',
    'Abidjan – Grand-Bassam',
    'Abidjan – Jacqueville',
  ],
  'Autres villes': [
    'Yamoussoukro',
    'Bouaké',
    'Daloa',
    'Korhogo',
    'San-Pédro',
    'Man',
    'Gagnoa',
    'Abengourou',
    'Divo',
    'Soubré',
    'Dimbokro',
    'Agboville',
    'Bondoukou',
    'Ferkessédougou',
    'Odienné',
    'Séguéla',
    'Touba',
    'Bouna',
    'Bangolo',
    'Issia',
    'Oumé',
    'Daoukro',
    'Bongouanou',
    'Adzopé',
    'Tiassalé',
    'Guiglo',
    'Duékoué',
    'Tabou',
  ],
}


const EMPTY_DELIVERY: DeliveryInfo = {
  prenom: '', nom: '', email: '', telephone: '', ville: '', quartier: '',
  adresse: '', notes: '', methode: 'standard',
}

// generateOrderId supprimé — l'ID est maintenant généré côté serveur


/* ═══════════════════════════════════════════════════════════════
   STEP BAR
═══════════════════════════════════════════════════════════════ */
function StepBar({ current }: { current: Step }) {
  if (current === 'succes') return null
  const idx = STEPS_LIST.findIndex(s => s.id === current)
  return (
    <nav className="flex items-center justify-center gap-0 mb-10">
      {STEPS_LIST.map((s, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done   ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' :
                active ? 'bg-gray-900 text-white ring-[3px] ring-gray-200' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={15} strokeWidth={2.5} /> : <span className="text-xs">{i + 1}</span>}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap tracking-wide ${
                done ? 'text-emerald-600' : active ? 'text-gray-900' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < STEPS_LIST.length - 1 && (
              <div className={`w-10 sm:w-16 lg:w-24 h-[2px] mb-6 mx-2 rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER SUMMARY SIDEBAR
═══════════════════════════════════════════════════════════════ */
function SummarySidebar({
  items, totalPrice, promoCode, promoDiscount, onPromoApply, shipping,
}: {
  items: CartItem[]; totalPrice: number; promoCode: string
  promoDiscount: number; onPromoApply: (code: string) => void; shipping: number
}) {
  const [input,   setInput]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Taux TVA par défaut
  const { data: taxData } = useQuery({
    queryKey: ['default-tax'],
    queryFn:  fetchDefaultTax,
    staleTime: 300_000,
  })
  const taxRate    = taxData?.data?.tax?.rate ?? 0
  const taxAmount  = Math.round(totalPrice * taxRate / 100)

  const totalSaved = items.reduce((s, i) => i.oldPrice ? s + (i.oldPrice - i.price) * i.qty : s, 0)
  const total      = totalPrice + taxAmount - promoDiscount + shipping

  const applyPromo = async () => {
    const code = input.trim().toUpperCase()
    if (!code) { setError('Entrez un code'); return }
    setLoading(true)
    setError('')
    try {
      await fetchPromo(code)
      onPromoApply(code)
    } catch {
      setError('Code invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart size={15} /> Récapitulatif de commande
        </p>
      </div>

      {/* Items */}
      <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
        {items.map(item => (
          <div key={item.productId} className="flex gap-3 items-start">
            <div className="relative shrink-0">
              <img src={item.image} alt={item.name}
                className="w-14 h-14 rounded-xl object-cover bg-gray-50 border border-gray-100" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800 text-white text-[9px] font-bold flex items-center justify-center">
                {item.qty}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{item.brand}</p>
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
              {item.color && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded-full border border-gray-200" style={{ background: item.color }} />
                  <span className="text-[10px] text-gray-400">couleur</span>
                </div>
              )}
            </div>
            <p className="text-xs font-bold text-gray-900 shrink-0">{fmtCart(item.price * item.qty)}</p>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div className="px-5 pb-4 border-t border-gray-100 pt-4">
        {promoCode ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <Gift size={13} className="text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-700">{promoCode}</p>
              <p className="text-[10px] text-emerald-600">-10% appliqué</p>
            </div>
            <span className="text-xs font-bold text-emerald-700">-{fmtCart(promoDiscount)}</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder="Code promo"
                className="w-full pl-8 pr-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white"
              />
            </div>
            <button onClick={applyPromo} disabled={loading}
              className="px-3 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap flex items-center gap-1 disabled:opacity-60">
              {loading ? <Loader2 size={12} className="animate-spin"/> : 'Appliquer'}
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
      </div>

      {/* Totals — détail complet */}
      <div className="border-t border-gray-100 px-5 py-4 space-y-2">
        {/* Sous-total HT */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Sous-total HT
            <span className="ml-1 text-[10px] text-gray-400">
              ({items.reduce((s,i)=>s+i.qty,0)} article{items.reduce((s,i)=>s+i.qty,0)>1?'s':''})
            </span>
          </span>
          <span className="font-medium text-gray-700">{fmtCart(totalPrice)}</span>
        </div>

        {/* Économies sur prix barrés */}
        {totalSaved > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 flex items-center gap-1">
              <Tag size={11} /> Réductions articles
            </span>
            <span className="font-semibold text-blue-600">−{fmtCart(totalSaved)}</span>
          </div>
        )}

        {/* Code promo */}
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 flex items-center gap-1">
              <Gift size={11} /> Code promo <span className="font-mono text-[10px] bg-emerald-100 px-1 rounded">{promoCode}</span>
            </span>
            <span className="font-semibold text-emerald-600">−{fmtCart(promoDiscount)}</span>
          </div>
        )}

        {/* Livraison */}
        <div className="flex justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Truck size={11} /> Livraison
          </span>
          <span className={shipping === 0 ? 'font-semibold text-emerald-600' : 'font-medium text-gray-700'}>
            {shipping === 0 ? '🎉 Gratuite' : fmtCart(shipping)}
          </span>
        </div>

        {/* TVA */}
        {taxRate > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Info size={11} /> TVA ({taxRate.toFixed(0)}%)
            </span>
            <span className="font-medium text-gray-700">{fmtCart(taxAmount)}</span>
          </div>
        )}

        {/* Séparateur + Total TTC */}
        <div className="pt-3 mt-1 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-base font-bold text-gray-900">Total TTC</p>
              {taxRate > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">TVA {taxRate.toFixed(0)}% incluse</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900">{fmtCart(total)}</p>
              {(promoDiscount > 0 || totalSaved > 0) && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Vous économisez {fmtCart(promoDiscount + totalSaved)} 🎉
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust */}
      <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 grid grid-cols-3 gap-2">
        {[
          { icon: <Shield size={12} className="text-emerald-500" />, label: 'Sécurisé' },
          { icon: <Truck size={12} className="text-blue-500" />,    label: 'Livraison rapide' },
          { icon: <RotateCcw size={12} className="text-orange-500" />, label: 'Retour 30j' },
        ].map(t => (
          <div key={t.label} className="flex flex-col items-center gap-1 text-center">
            {t.icon}
            <span className="text-[9px] text-gray-500 font-medium leading-tight">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPE 1 — PANIER
═══════════════════════════════════════════════════════════════ */
function StepCart({ items, totalPrice, onNext, promoCode, promoDiscount, onPromoApply, shipping, outOfStockIds }: {
  items: CartItem[]; totalPrice: number; onNext: () => void
  promoCode: string; promoDiscount: number; onPromoApply: (c: string) => void; shipping: number
  outOfStockIds: Set<number>
}) {
  const { removeItem, updateQty } = useCart()
  const [promoInput,   setPromoInput]   = useState('')
  const [promoError,   setPromoError]   = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const hasOutOfStock = items.some(i => outOfStockIds.has(i.productId))

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) { setPromoError('Entrez un code'); return }
    setPromoLoading(true)
    setPromoError('')
    try {
      await fetchPromo(code)
      onPromoApply(code)
    } catch {
      setPromoError('Code invalide ou expiré')
    } finally {
      setPromoLoading(false)
    }
  }

  // TVA (cache partagé avec SummarySidebar)
  const { data: taxData } = useQuery({ queryKey: ['default-tax'], queryFn: fetchDefaultTax, staleTime: 300_000 })
  const taxRate   = taxData?.data?.tax?.rate ?? 0
  const taxAmount = Math.round(totalPrice * taxRate / 100)

  const progressPct = Math.min((totalPrice / SHIPPING_FREE) * 100, 100)
  const totalSaved  = items.reduce((s, i) => i.oldPrice ? s + (i.oldPrice - i.price) * i.qty : s, 0)
  const total       = totalPrice + taxAmount - promoDiscount + shipping

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center gap-5">
        <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center">
          <ShoppingCart size={36} className="text-gray-200" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Votre panier est vide</h2>
          <p className="text-gray-400 text-sm mt-1.5 max-w-xs">
            Ajoutez des produits depuis notre catalogue pour démarrer votre commande.
          </p>
        </div>
        <Link to="/catalogue"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors">
          Découvrir le catalogue <ChevronRight size={15} />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Barre livraison gratuite */}
      {totalPrice < SHIPPING_FREE ? (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
              <Truck size={14} />
              Plus que <strong>{fmtCart(SHIPPING_FREE - totalPrice)}</strong> pour la livraison gratuite !
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
              initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-3.5 border border-emerald-100 flex items-center gap-2.5">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-bold text-emerald-800">Livraison gratuite débloquée !</p>
            <p className="text-xs text-emerald-600">Votre commande bénéficie de la livraison offerte.</p>
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">
            {items.length} article{items.length > 1 ? 's' : ''} dans votre panier
          </span>
          {totalSaved > 0 && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Vous économisez {fmtCart(totalSaved)}
            </span>
          )}
        </div>

        <AnimatePresence>
          {items.map((item, idx) => {
            const disc = item.oldPrice ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100) : 0
            return (
              <motion.div key={item.productId} layout
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className={`p-5 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <Link to={`/catalogue/${item.productId}`} className="shrink-0 group">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {disc > 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold">
                          -{disc}%
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.brand}</p>
                        <Link to={`/catalogue/${item.productId}`}>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors mt-0.5 leading-snug">
                            {item.name}
                          </p>
                        </Link>
                        {item.color && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 shadow-sm" style={{ background: item.color }} />
                            <span className="text-[10px] text-gray-400">Couleur sélectionnée</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.productId)}
                        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Badge rupture de stock */}
                    {outOfStockIds.has(item.productId) && (
                      <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 w-fit">
                        <AlertCircle size={11} className="text-red-500 shrink-0" />
                        <span className="text-[11px] font-bold text-red-600">Rupture de stock — retirez cet article</span>
                      </div>
                    )}

                    {/* Prix + quantité */}
                    <div className={`flex items-end justify-between mt-3 ${outOfStockIds.has(item.productId) ? 'opacity-40' : ''}`}>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{fmtCart(item.price * item.qty)}</p>
                        {disc > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-gray-400 line-through">{fmtCart(item.oldPrice! * item.qty)}</p>
                            <span className="text-xs font-bold text-red-500">-{disc}%</span>
                          </div>
                        )}
                        {item.qty > 1 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{fmtCart(item.price)} / unité</p>
                        )}
                      </div>

                      {/* Qty controls */}
                      <div className={`flex items-center gap-1 rounded-xl border overflow-hidden ${
                        outOfStockIds.has(item.productId) ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <button onClick={() => updateQty(item.productId, item.qty - 1)}
                          disabled={outOfStockIds.has(item.productId)}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed">
                          <Minus size={13} />
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-gray-900">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, item.qty + 1)}
                          disabled={outOfStockIds.has(item.productId)}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Code promo mobile */}
      <div className="lg:hidden bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Tag size={14} /> Code promo</p>
        {promoCode ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <Gift size={13} className="text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 flex-1">{promoCode}</span>
            <span className="text-xs font-bold text-emerald-700">-{fmtCart(promoDiscount)}</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input value={promoInput} onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder="Entrez votre code promo…"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 bg-white" />
              <button onClick={applyPromo} disabled={promoLoading}
                className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:opacity-60">
                {promoLoading ? <Loader2 size={14} className="animate-spin"/> : 'OK'}
              </button>
            </div>
            {promoError && <p className="text-red-400 text-xs mt-1.5">{promoError}</p>}
          </>
        )}
      </div>

      {/* Récap prix mobile */}
      <div className="lg:hidden bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
          <ShoppingCart size={14} /> Récapitulatif
        </p>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Sous-total HT</span>
          <span className="font-medium text-gray-700">{fmtCart(totalPrice)}</span>
        </div>
        {totalSaved > 0 && (
          <div className="flex justify-between text-sm text-blue-600">
            <span>Réductions articles</span>
            <span className="font-semibold">−{fmtCart(totalSaved)}</span>
          </div>
        )}
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Code promo ({promoCode})</span>
            <span className="font-semibold">−{fmtCart(promoDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Livraison</span>
          <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : 'text-gray-700 font-medium'}>
            {shipping === 0 ? '🎉 Gratuite' : fmtCart(shipping)}
          </span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>TVA ({taxRate.toFixed(0)}%)</span>
            <span className="font-medium text-gray-700">{fmtCart(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-base pt-2 border-t border-gray-200 mt-1">
          <div>
            <span className="text-gray-900">Total TTC</span>
            {taxRate > 0 && <p className="text-[10px] text-gray-400 font-normal">TVA {taxRate.toFixed(0)}% incluse</p>}
          </div>
          <span className="text-gray-900">{fmtCart(total)}</span>
        </div>
      </div>

      {/* Produits suggérés */}
      <SuggestedProducts currentIds={items.map(i => i.productId)} />

      {/* Alerte rupture de stock */}
      {hasOutOfStock && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Produits en rupture de stock</p>
            <p className="text-xs text-red-500 mt-0.5">
              Retirez les articles indisponibles pour continuer votre commande.
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      <button onClick={hasOutOfStock ? undefined : onNext}
        disabled={hasOutOfStock}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
          hasOutOfStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] shadow-lg shadow-gray-900/10'
        }`}>
        {hasOutOfStock ? 'Panier indisponible' : <>Continuer vers la livraison <ChevronRight size={17} /></>}
      </button>

      {/* Garanties */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Lock size={24} />, title: 'Paiement sécurisé', sub: 'Données chiffrées' },
          { icon: <Van size={24} />, title: 'Livraison rapide',   sub: '24 à 72h' },
          { icon: <Undo2 size={24} />, title: 'Retours gratuits',   sub: 'Sous 30 jours' },
        ].map(g => (
          <div key={g.title} className="bg-white flex flex-col items-center rounded-xl border border-gray-100 p-3 text-center">
            <span className="text-xl">{g.icon}</span>
            <p className="text-xs font-bold text-gray-800 mt-1 leading-tight">{g.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{g.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Suggestions ─── */
function SuggestedProducts({ currentIds }: { currentIds: number[] }) {
  const { addItem } = useCart()
  const { data } = useQuery({
    queryKey: ['suggested-products'],
    queryFn:  () => fetchProducts({ sort: 'popular', limit: 8 }),
    staleTime: 120_000,
  })

  const suggested = (data?.data.products ?? [])
    .map(mapApiProduct)
    .filter(p => !currentIds.includes(p.id))
    .slice(0, 4)

  if (!suggested.length) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Star size={14} className="text-yellow-400 fill-yellow-400" /> Vous aimerez aussi
      </p>
      <div className="grid grid-cols-2 gap-3">
        {suggested.map(p => (
          <div key={p.id} className="flex gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <Link to={`/catalogue/${p.id}`} className="shrink-0">
              <img src={p.images[0]} alt={p.name}
                className="w-14 h-14 rounded-lg object-cover bg-gray-50" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{p.brand}</p>
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs font-bold text-gray-900">{fmtCart(p.price)}</p>
                <button onClick={() => addItem({ productId: p.id, name: p.name, brand: p.brand, price: p.price, oldPrice: p.oldPrice, image: p.images[0] })}
                  className="w-6 h-6 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Plus size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPE 2 — LIVRAISON
═══════════════════════════════════════════════════════════════ */
function StepLivraison({ delivery, setDelivery, onNext, onBack, totalPrice }: {
  delivery: DeliveryInfo; setDelivery: (d: DeliveryInfo) => void
  onNext: () => void; onBack: () => void; totalPrice: number
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryInfo, string>>>({})
  const set = (k: keyof DeliveryInfo) => (v: string) => {
    setDelivery({ ...delivery, [k]: v })
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!delivery.prenom.trim())    e.prenom    = 'Champ requis'
    if (!delivery.nom.trim())       e.nom       = 'Champ requis'
    if (!delivery.email.trim())     e.email     = 'Champ requis'
    else if (!/\S+@\S+\.\S+/.test(delivery.email)) e.email = 'Email invalide'
    if (!delivery.telephone.trim()) e.telephone = 'Champ requis'
    else {
      /* CI : 10 chiffres (0X XX XX XX XX) ou 9 chiffres (sans le 0 initial) */
      const digits = delivery.telephone.replace(/[\s\-().]/g, '')
      if (!/^(0[0-9]{9}|[0-9]{9})$/.test(digits))
        e.telephone = 'Numéro ivoirien invalide (ex: 07 00 00 00 00)'
    }
    if (!delivery.ville.trim())     e.ville     = 'Champ requis'
    if (!delivery.adresse.trim())   e.adresse   = 'Champ requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const shippingFree = totalPrice >= SHIPPING_FREE

  return (
    <div className="space-y-5">

      {/* Méthode de livraison */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Truck size={15} className="text-blue-500" /> Méthode de livraison
        </h3>
        <div className="space-y-3">
          {[
            {
              id: 'standard' as const,
              label: 'Livraison Standard',
              delay: '3 à 5 jours ouvrés',
              price: shippingFree ? 0 : SHIPPING_STD,
              icon: <Package size={24} />,
              note: shippingFree ? '🎉 Gratuite (seuil atteint)' : null,
            },
            {
              id: 'express' as const,
              label: 'Livraison Express',
              delay: '24 à 72h garanties',
              price: SHIPPING_EXP,
              icon: <Zap size={24} />,
              note: 'Prioritaire · Appel avant livraison',
            },
          ].map(opt => (
            <button key={opt.id} onClick={() => set('methode')(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                delivery.methode === opt.id
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}>
              <span className="text-2xl shrink-0">{opt.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                  {opt.id === 'express' && (
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">RAPIDE</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{opt.delay}</p>
                {opt.note && <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">{opt.note}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">
                  {opt.price === 0 ? <span className="text-emerald-600">Gratuite</span> : fmtCart(opt.price)}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                delivery.methode === opt.id ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
              }`}>
                {delivery.methode === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire adresse */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
          <MapPin size={15} className="text-blue-500" /> Adresse de livraison
        </h3>

        <div className="space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Prénom" value={delivery.prenom} onChange={set('prenom')}
              placeholder="Jean" error={errors.prenom} icon={<User size={14} />} />
            <InputField label="Nom" value={delivery.nom} onChange={set('nom')}
              placeholder="Dupont" error={errors.nom} />
          </div>

          {/* Email */}
          <InputField
            label="Email" value={delivery.email} onChange={set('email')}
            placeholder="jean@exemple.com" error={errors.email}
            icon={<Mail size={14} />}
          />

          {/* Téléphone */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Téléphone <span className="text-red-400">*</span>
            </label>
            <div className={`flex items-center rounded-xl border-2 transition-all overflow-hidden ${
              errors.telephone ? 'border-red-300' : 'border-gray-200 focus-within:border-gray-400'
            }`}>
              <div className="flex items-center gap-1.5 px-3.5 py-3 bg-gray-50 border-r border-gray-200 shrink-0 select-none">
                <span className="text-base">🇨🇮</span>
                <span className="text-sm font-semibold text-gray-700">+225</span>
              </div>
              <input
                type="tel"
                value={delivery.telephone}
                onChange={e => set('telephone')(e.target.value)}
                placeholder="07 00 00 00 00"
                maxLength={14}
                inputMode="tel"
                className="flex-1 px-3.5 py-3 text-sm bg-white focus:outline-none placeholder:text-gray-300" />
            </div>
            {errors.telephone && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.telephone}</p>}
          </div>

          {/* Ville */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Ville <span className="text-red-400">*</span>
            </label>
            <div className={`relative rounded-xl border-2 transition-all overflow-hidden ${
              errors.ville ? 'border-red-300' : 'border-gray-200 focus-within:border-gray-400'
            }`}>
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select value={delivery.ville} onChange={e => set('ville')(e.target.value)}
                className={`w-full pl-9 pr-8 py-3 text-sm bg-white focus:outline-none appearance-none ${!delivery.ville ? 'text-gray-300' : 'text-gray-800'}`}>
                <option value="">Sélectionner votre ville / commune</option>
                {Object.entries(VILLES_CI).map(([groupe, villes]) => (
                  <optgroup key={groupe} label={groupe}>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </optgroup>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
            </div>
            {errors.ville && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.ville}</p>}
          </div>

          {/* Quartier */}
          <InputField label="Quartier / Zone" value={delivery.quartier}
            onChange={set('quartier')} placeholder="Zone 4, Riviera, Deux-Plateaux, Adjamé 220 Lgts…" required={false} />

          {/* Adresse */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Adresse complète <span className="text-red-400">*</span>
            </label>
            <textarea rows={3} value={delivery.adresse}
              onChange={e => set('adresse')(e.target.value)}
              placeholder="Rue, N° de villa/immeuble, carrefour, repère géographique…"
              className={`w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none transition-all bg-white resize-none placeholder:text-gray-300 ${
                errors.adresse ? 'border-red-300' : 'border-gray-200 focus:border-gray-400'
              }`} />
            {errors.adresse && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.adresse}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5 flex items-center gap-1">
              Instructions pour le livreur <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea rows={2} value={delivery.notes}
              onChange={e => set('notes')(e.target.value)}
              placeholder="Ex : Sonner au portail, appeler 10 min avant d'arriver…"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-all bg-white resize-none placeholder:text-gray-300" />
          </div>
        </div>
      </div>

      {/* Nav */}
      <NavButtons onBack={onBack} onNext={() => { if (validate()) onNext() }} nextLabel="Choisir le paiement" />
    </div>
  )
}

/* ─── Input helper ─── */
function InputField({ label, value, onChange, placeholder, error, icon, required = true }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; icon?: React.ReactNode; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className={`flex items-center rounded-xl border-2 transition-all overflow-hidden ${
        error ? 'border-red-300' : 'border-gray-200 focus-within:border-gray-400'
      }`}>
        {icon && <span className="pl-3.5 text-gray-400 shrink-0">{icon}</span>}
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${icon ? 'pl-2' : 'pl-4'} pr-4 py-3 text-sm bg-white focus:outline-none placeholder:text-gray-300`} />
      </div>
      {error && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{error}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPE 3 — PAIEMENT
═══════════════════════════════════════════════════════════════ */
function StepPaiement({ selected, onSelect, onNext, onBack }: {
  selected: PaymentMethod | null; onSelect: (m: PaymentMethod) => void
  onNext: () => void; onBack: () => void
}) {
  const [noSelect, setNoSelect] = useState(false)

  const handleNext = () => {
    if (!selected) { setNoSelect(true); return }
    onNext()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard size={15} className="text-blue-500" /> Choisissez votre mode de paiement
        </h3>

        <div className="space-y-3">
          {PAYMENT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { onSelect(opt.id); setNoSelect(false) }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selected === opt.id
                  ? `${opt.border} ${opt.bg} shadow-sm ring-4 ${opt.ring}`
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
              }`}>
              {/* Logo */}
              <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                {opt.logo
                  ? <img src={opt.logo} alt={opt.label} className="w-full h-full object-contain" />
                  : <Banknote size={22} className="text-green-600" />
                }
              </div>
              {/* Label */}
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
              {/* Radio */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                selected === opt.id ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
              }`}>
                {selected === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>

        {noSelect && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            <AlertCircle size={14} /> Veuillez sélectionner un mode de paiement
          </div>
        )}
      </div>

      {/* Instructions contextuelles */}
      <AnimatePresence>
        {selected && (
          <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${
              selected === 'cash'
                ? 'bg-green-50 border-green-100 text-green-800'
                : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}>
            {selected === 'cash' ? (
              <>
                <p className="text-sm font-bold mb-2 flex items-center gap-2"><Banknote size={14} /> Paiement à la livraison</p>
                <ul className="space-y-1.5 text-xs text-green-700">
                  <li className="flex items-start gap-2"><span className="mt-0.5">✓</span> Préparez le montant exact en espèces</li>
                  <li className="flex items-start gap-2"><span className="mt-0.5">✓</span> Le livreur vous appellera avant de se déplacer</li>
                  <li className="flex items-start gap-2"><span className="mt-0.5">✓</span> Aucun paiement en ligne requis</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Smartphone size={14} />
                  {PAYMENT_OPTIONS.find(p=>p.id===selected)?.logo && (
                    <img src={PAYMENT_OPTIONS.find(p=>p.id===selected)!.logo} alt="" className="w-4 h-4 object-contain" />
                  )}
                  Paiement {PAYMENT_OPTIONS.find(p=>p.id===selected)?.label}
                </p>
                <ol className="space-y-1.5 text-xs text-blue-700">
                  <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[9px]">1</span>Après confirmation, une demande de paiement sera envoyée sur votre téléphone</li>
                  <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[9px]">2</span>Entrez votre code secret pour valider le paiement</li>
                  <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[9px]">3</span>Votre commande est préparée dès confirmation du paiement</li>
                </ol>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sécurité */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900">Paiement 100% sécurisé</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Toutes vos données sont chiffrées et sécurisées. Koli ne stocke jamais vos informations de paiement.
            </p>
          </div>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel="Vérifier la commande" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPE 4 — CONFIRMATION
═══════════════════════════════════════════════════════════════ */
function StepConfirmation({ items, delivery, paymentMethod, totalPrice, promoDiscount, onConfirm, onBack, loading }: {
  items: CartItem[]; delivery: DeliveryInfo; paymentMethod: PaymentMethod
  totalPrice: number; promoDiscount: number; onConfirm: () => void; onBack: () => void; loading: boolean
}) {
  const shipping = delivery.methode === 'express' ? SHIPPING_EXP
    : totalPrice >= SHIPPING_FREE ? 0 : SHIPPING_STD
  const { data: taxDataConf } = useQuery({ queryKey: ['default-tax'], queryFn: fetchDefaultTax, staleTime: 300_000 })
  const taxRateConf   = taxDataConf?.data?.tax?.rate ?? 0
  const taxAmountConf = Math.round(totalPrice * taxRateConf / 100)
  const total = totalPrice + taxAmountConf - promoDiscount + shipping
  const pm    = PAYMENT_OPTIONS.find(p => p.id === paymentMethod)!

  return (
    <div className="space-y-4">

      {/* Alerte info */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
        <Info size={15} className="shrink-0" />
        Vérifiez vos informations avant de confirmer. Vous recevrez une confirmation dans votre boite mail.
      </div>

      {/* Livraison recap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> Livraison</h3>
          <button onClick={onBack} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            <Edit2 size={11} /> Modifier
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Destinataire</p>
            <p className="font-semibold text-gray-900">{delivery.prenom} {delivery.nom}</p>
            <p className="text-gray-500 mt-0.5">+225 {delivery.telephone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
            <p className="font-medium text-gray-800">{delivery.ville}{delivery.quartier ? `, ${delivery.quartier}` : ''}</p>
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{delivery.adresse}</p>
          </div>
        </div>
        {delivery.notes && (
          <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 rounded-lg p-2.5">📝 {delivery.notes}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delivery.methode === 'express'
            ? <span className="flex items-center gap-1 text-orange-600 font-semibold bg-orange-50 px-2.5 py-1.5 rounded-lg"><Zap size={11}/> Express · 24–72h</span>
            : <span className="flex items-center gap-1 text-blue-600 font-semibold bg-blue-50 px-2.5 py-1.5 rounded-lg"><Truck size={11}/> Standard · 3–5 jours</span>
          }
          <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg"><Clock size={11}/> Estimé : {new Date(Date.now() + (delivery.methode === 'express' ? 2 : 5) * 86400000).toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'})}</span>
        </div>
      </div>

      {/* Paiement recap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard size={14} className="text-blue-500" /> Paiement</h3>
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 ${pm.border} ${pm.bg}`}>
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-1.5">
            {pm.logo
              ? <img src={pm.logo} alt={pm.label} className="w-full h-full object-contain" />
              : <Banknote size={20} className="text-green-600" />
            }
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{pm.label}</p>
            <p className="text-xs text-gray-500">{pm.desc}</p>
          </div>
        </div>
      </div>

      {/* Articles recap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package size={14} className="text-blue-500" /> Articles commandés
          <span className="ml-auto text-xs text-gray-400 font-normal">{items.reduce((s,i)=>s+i.qty,0)} article{items.reduce((s,i)=>s+i.qty,0)>1?'s':''}</span>
        </h3>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.productId} className="flex gap-3 items-center">
              <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover bg-gray-50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.brand}</p>
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Quantité : {item.qty}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">{fmtCart(item.price * item.qty)}</p>
            </div>
          ))}
        </div>

        {/* Totaux détaillés */}
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total HT</span>
            <span className="font-medium text-gray-700">{fmtCart(totalPrice)}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Code promo</span>
              <span className="font-semibold">−{fmtCart(promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-500">
            <span>Livraison {delivery.methode === 'express' ? '(Express)' : '(Standard)'}</span>
            <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : 'text-gray-700 font-medium'}>
              {shipping === 0 ? '🎉 Gratuite' : fmtCart(shipping)}
            </span>
          </div>
          {taxRateConf > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA ({taxRateConf.toFixed(0)}%)</span>
              <span className="font-medium text-gray-700">{fmtCart(taxAmountConf)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div>
              <p className="font-bold text-lg text-gray-900">Total TTC</p>
              {taxRateConf > 0 && <p className="text-[10px] text-gray-400">TVA {taxRateConf.toFixed(0)}% incluse</p>}
            </div>
            <span className="font-black text-xl text-gray-900">{fmtCart(total)}</span>
          </div>
        </div>
      </div>

      {/* CGU */}
      <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
        En confirmant, vous acceptez nos{' '}
        <Link to="/cgu" className="text-blue-600 underline underline-offset-2">CGU</Link> et notre{' '}
        <Link to="/privacy" className="text-blue-600 underline underline-offset-2">Politique de confidentialité</Link>.
        Koli respecte vos données.
      </p>

      {/* Boutons */}
      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex items-center gap-2 px-5 py-4 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors">
          <ChevronLeft size={15} /> Retour
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-emerald-600/20">
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            <><CheckCircle2 size={17} /> Confirmer ma commande</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPE 5 — SUCCÈS
═══════════════════════════════════════════════════════════════ */
function StepSucces({ orderId, paymentMethod, delivery }: {
  orderId: string; paymentMethod: PaymentMethod; delivery: DeliveryInfo
}) {
  const navigate  = useNavigate()
  const settings  = useSiteSettings()
  const [copied, setCopied] = useState(false)
  const pm = PAYMENT_OPTIONS.find(p => p.id === paymentMethod)!

  const copy = () => {
    navigator.clipboard.writeText(orderId).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
        className="flex flex-col items-center text-center gap-6">

        {/* Icône succès */}
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
          className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-400/30">
            <CheckCircle2 size={54} className="text-white" strokeWidth={1.5} />
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}
            className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow-md">
            🎉
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Commande confirmée !</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
            Merci {delivery.prenom} ! Votre commande a été enregistrée. Vous recevrez un message de confirmation par mail sous peu.
          </p>
        </motion.div>

        {/* Numéro commande */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 font-medium mb-2">Référence de votre commande</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl font-bold text-gray-900 font-mono tracking-wide">{orderId}</span>
            <button onClick={copy}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all">
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Conservez ce numéro pour suivre votre commande</p>
        </motion.div>

        {/* Instructions paiement mobile */}
        {paymentMethod !== 'cash' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className={`w-full p-5 rounded-2xl border text-left ${pm.bg} ${pm.border}`}>
            <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Smartphone size={15} />
              {pm.logo && <img src={pm.logo} alt={pm.label} className="w-5 h-5 object-contain rounded" />}
              Instructions — {pm.label}
            </p>
            <ol className="space-y-3">
              {[
                'Une demande de paiement va être envoyée sur votre téléphone.',
                'Validez en entrant votre code secret Mobile Money.',
                'Votre commande est préparée dès réception du paiement.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${pm.badge}`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        {/* Timeline livraison */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="w-full bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-900 mb-4 text-center">Suivi de votre commande</p>
          <div className="flex items-center justify-between">
            {[
              { icon: <CheckCircle2 size={18} />, label: 'Confirmée',   sub: "À l'instant",         active: true },
              { icon: <Package size={18} />,      label: 'En préparation', sub: '24–48h',            active: false },
              { icon: <Truck size={18} />,        label: 'En livraison', sub: delivery.methode === 'express' ? '48h' : '3–5j', active: false },
              { icon: <Star size={18} />,         label: 'Livrée',       sub: 'À confirmer',         active: false },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    s.active ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s.icon}
                  </div>
                  <p className={`text-[10px] font-semibold text-center ${s.active ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                  <p className="text-[9px] text-gray-400 text-center">{s.sub}</p>
                </div>
                {i < arr.length - 1 && <div className="w-6 sm:w-10 h-0.5 bg-gray-200 mx-1 mb-6" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="w-full bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 text-center mb-3">Besoin d'aide avec votre commande ?</p>
          <div className="flex gap-3">
            <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
              <MessageCircle size={15} /> WhatsApp SAV
            </a>
            <a href={telLink(settings.supportPhone)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 transition-colors">
              <Phone size={15} /> Appeler
            </a>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="w-full flex flex-col gap-3">
          <button onClick={() => navigate(`/commandes/${orderId}`)}
            className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10">
            <Package size={16} /> Suivre ma commande
          </button>
          <Link to="/catalogue"
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 hover:border-gray-300 hover:text-gray-800 transition-colors">
            Continuer mes achats
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─── Nav buttons helper ─── */
function NavButtons({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex gap-3 pt-1">
      <button onClick={onBack}
        className="flex items-center gap-2 px-5 py-4 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all">
        <ChevronLeft size={15} /> Retour
      </button>
      <button onClick={onNext}
        className="flex-1 py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg shadow-gray-900/10">
        {nextLabel} <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export default function PanierPage() {
  const { items, totalPrice, clearCart } = useCart()
  const { user, token } = useAuth()
  const [step,          setStep]          = useState<Step>('cart')
  const [delivery,      setDelivery]      = useState<DeliveryInfo>(EMPTY_DELIVERY)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [promoCode,     setPromoCode]     = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [orderId,       setOrderId]       = useState('')
  const [loading,       setLoading]       = useState(false)
  const [orderError,    setOrderError]    = useState('')

  /* Pré-remplir email depuis le compte connecté */
  useEffect(() => {
    if (user) {
      setDelivery(d => ({
        ...d,
        prenom: d.prenom || user.prenom,
        nom:    d.nom    || user.nom,
        email:  d.email  || user.email,
      }))
    }
  }, [user])

  const shipping = delivery.methode === 'express' ? SHIPPING_EXP
    : totalPrice >= SHIPPING_FREE ? 0 : SHIPPING_STD

  // Vérification stock en temps réel pour tous les articles du panier
  const stockQueries = useQueries({
    queries: items.map(item => ({
      queryKey: ['stock-check', item.productId],
      queryFn:  () => fetchProduct(item.productId),
      staleTime: 30_000,
      enabled:  step === 'cart',
    })),
  })
  const outOfStockIds = new Set<number>(
    stockQueries
      .map((q, i) => ({ productId: items[i]?.productId, stock: q.data?.data?.product?.stock }))
      .filter(r => r.stock === 0)
      .map(r => r.productId!)
  )

  const goNext = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1])
  }
  const goBack = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  const handlePromoApply = async (code: string) => {
    try {
      const res = await fetchPromo(code)
      setPromoCode(code)
      // Calculer la remise selon le type de promo retourné par l'API
      const promo = res.data
      if (promo.type === 'percent') {
        setPromoDiscount(Math.round(totalPrice * promo.value / 100))
      } else {
        setPromoDiscount(promo.value)
      }
    } catch { /* erreur gérée dans l'enfant */ }
  }

  const handleConfirm = async () => {
    if (!paymentMethod) return
    setLoading(true)
    setOrderError('')
    try {
      const res = await createOrder(
        {
          clientPrenom:    delivery.prenom,
          clientNom:       delivery.nom,
          clientEmail:     delivery.email,
          clientTelephone: delivery.telephone,
          deliveryMethod:  delivery.methode,
          shippingAddress: {
            ville:        delivery.ville,
            quartier:     delivery.quartier || undefined,
            adresse:      delivery.adresse,
            instructions: delivery.notes   || undefined,
          },
          paymentMethod,
          items: items.map(i => ({
            productId: i.productId,
            qty:       i.qty,
            color:     i.color,
          })),
          promoCode: promoCode || undefined,
          notes:     delivery.notes || undefined,
        },
        token,
      )
      setOrderId(res.data.orderNumber)
      clearCart()
      setStep('succes')
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Erreur lors de la commande. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-black text-xl tracking-tight text-gray-900">
            <img src="/imgs_dropship/logoSkignas.png" 
            className="w-37 h-12"
            alt="" />          
          </Link>
          {step !== 'succes' && (
            <Link
              to={step === 'cart' ? '/catalogue' : '#'}
              onClick={step !== 'cart' ? e => { e.preventDefault(); goBack() } : undefined}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={14} />
              {step === 'cart' ? 'Continuer les achats' : 'Étape précédente'}
            </Link>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Shield size={12} className="text-emerald-500" /> Paiement sécurisé
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Titre */}
        {step !== 'succes' && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {step === 'cart'         ? 'Mon Panier'               :
               step === 'livraison'    ? 'Informations de livraison' :
               step === 'paiement'     ? 'Mode de paiement'          :
               '✅ Confirmation de commande'}
            </h1>
          </div>
        )}

        {/* Step bar */}
        <StepBar current={step} />

        {step === 'succes' ? (
          <StepSucces orderId={orderId} paymentMethod={paymentMethod!} delivery={delivery} />
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 items-start">

            {/* Contenu principal */}
            <div>
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>

                  {step === 'cart' && (
                    <StepCart items={items} totalPrice={totalPrice} shipping={shipping}
                      promoCode={promoCode} promoDiscount={promoDiscount} onPromoApply={handlePromoApply}
                      onNext={goNext} outOfStockIds={outOfStockIds} />
                  )}
                  {step === 'livraison' && (
                    <StepLivraison delivery={delivery} setDelivery={setDelivery}
                      totalPrice={totalPrice} onNext={goNext} onBack={goBack} />
                  )}
                  {step === 'paiement' && (
                    <StepPaiement selected={paymentMethod} onSelect={setPaymentMethod}
                      onNext={goNext} onBack={goBack} />
                  )}
                  {step === 'confirmation' && (
                    <>
                      {orderError && (
                        <div className="mb-4 flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
                          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{orderError}</p>
                        </div>
                      )}
                      <StepConfirmation items={items} delivery={delivery} paymentMethod={paymentMethod!}
                        totalPrice={totalPrice} promoDiscount={promoDiscount}
                        onConfirm={handleConfirm} onBack={goBack} loading={loading} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar desktop */}
            <div className="hidden lg:block sticky top-20">
              <SummarySidebar items={items} totalPrice={totalPrice} shipping={shipping}
                promoCode={promoCode} promoDiscount={promoDiscount} onPromoApply={handlePromoApply} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
