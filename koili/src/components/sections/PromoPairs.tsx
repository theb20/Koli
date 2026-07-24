import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingCart, Star, Flame, ArrowRight, Zap, Timer, BadgePercent, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_BASE, mapApiProduct } from '../../lib/api'
import { useCart } from '../../contexts/CartContext'

type Product = ReturnType<typeof mapApiProduct>

type FlashApiProduct = {
  id: number; name: string; brand: string; price: number; salePrice: number
  saleEndsAt: string; rating: number; reviews: number; sold: number; stock: number
  badge: 'hot' | 'new' | 'sale' | 'top' | null
  images: { url: string }[]
}

async function fetchActiveDeals(): Promise<FlashApiProduct[]> {
  const res = await fetch(`${API_BASE}/api/flash`)
  const json = await res.json()
  return json?.data?.products ?? []
}

/** Un produit en promo (prix + ancien prix + échéance réelle de fin de vente) */
function mapDealProduct(p: FlashApiProduct): Product {
  return {
    id: p.id, name: p.name, brand: p.brand, category: '',
    price: p.salePrice, oldPrice: p.price,
    rating: p.rating, reviews: p.reviews, badge: p.badge ?? undefined,
    sold: p.sold, stock: p.stock, isNew: false,
    images: p.images.length ? p.images.map(i => i.url) : [''],
  } as Product
}

/* ─────────────────────────────────────────
   COUNTDOWN — échéance réelle (fin de la promo la plus proche)
───────────────────────────────────────── */
function useCountdown(endAtIso: string | null) {
  const endAt = endAtIso ? new Date(endAtIso).getTime() : null
  const [time, setTime] = useState(() => (endAt ? Math.max(0, Math.floor((endAt - Date.now()) / 1000)) : 0))

  useEffect(() => {
    if (!endAt) { setTime(0); return }
    const tick = () => setTime(Math.max(0, Math.floor((endAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endAt])

  const h = String(Math.floor(time / 3600)).padStart(2, '0')
  const m = String(Math.floor((time % 3600) / 60)).padStart(2, '0')
  const s = String(time % 60).padStart(2, '0')
  return { h, m, s, expired: endAt !== null && time <= 0 }
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function discountPct(price: number, old: number) {
  return Math.round(((old - price) / old) * 100)
}

function formatPrice(n: number) {
  return Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

/* ─────────────────────────────────────────
   DIGIT FLIP
───────────────────────────────────────── */
function Digit({ value }: { value: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={value}
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="inline-block tabular-nums">{value}</motion.span>
    </AnimatePresence>
  )
}

function Countdown({ h, m, s }: { h: string; m: string; s: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {[{ v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }].map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-gray-900 rounded-xl px-3.5 py-2 min-w-[54px] justify-center shadow-sm">
            <span className="text-white font-black text-lg tracking-tighter overflow-hidden">
              <Digit value={v[0]} /><Digit value={v[1]} />
            </span>
            <span className="text-white/50 text-[10px] font-medium ml-0.5">{l}</span>
          </div>
          {i < 2 && <span className="text-gray-300 font-bold text-base">:</span>}
        </div>
      ))}
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
       <Star
          key={i}
          className="w-3 h-3"
          fill={i < Math.floor(rating) ? "#f5d60bff" : "#e5e7eb"}
          stroke={i < Math.floor(rating) ? "#f5d60bff" : "#e5e7eb"}
        />
      ))}
      <span className="text-gray-400 text-[11px] ml-1.5 tabular-nums font-medium">{rating}</span>
    </div>
  )
}

function StockBar({ stock, sold, accent }: { stock: number; sold: number; accent: string }) {
  const pct = Math.round((stock / Math.max(stock + sold, 1)) * 100)
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-gray-400">{sold} vendus</span>
        <span className={pct < 20 ? 'text-red-500 flex items-center gap-0.5' : 'text-gray-400'}>{pct < 20 && <Flame size={15} /> }Il reste {stock}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full" style={{ background: accent }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   HERO DEAL
───────────────────────────────────────── */
const ACCENT = '#f97316'
const ACCENT_END = '#ef4444'

function HeroDeal({ product }: { product: Product }) {
  const { addItem } = useCart()
  const disc = product.oldPrice ? discountPct(product.price, product.oldPrice) : 0

  return (
    <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-sm flex flex-col h-full">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ background: ACCENT }} />

      <div className="relative h-[200px] sm:h-[240px] lg:h-[280px] overflow-hidden bg-gray-50">
        <img src={product.thumbnails[0]} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {disc > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-white/60 text-gray-800 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
              <Zap size={10} style={{ color: ACCENT }} fill={ACCENT} />
              -{disc}% aujourd'hui
            </span>
          )}
          {product.badge && (
            <span className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-white/60 text-gray-500 text-[11px] px-3 py-1.5 rounded-full shadow-sm">
              {product.badge === 'hot' ? 'Best-seller' : product.badge === 'new' ? 'Nouveau' : 'Top noté'}
            </span>
          )}
        </div>
        {disc > 0 && (
          <div className="absolute top-4 right-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white text-sm shadow-lg"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_END})` }}>
            -{disc}%
          </div>
        )}
      </div>

      <div className="relative z-10 p-7 flex flex-col flex-1">
        <Stars rating={product.rating} />
        <p className="text-gray-400 text-[11px] mt-1 mb-4 tabular-nums">{product.reviews.toLocaleString()} avis vérifiés</p>
        <h3 className="text-2xl text-gray-900 leading-tight tracking-tight">{product.name}</h3>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">{product.brand}</p>

        <div className="flex items-end gap-3 mt-6">
          <span className="text-4xl tabular-nums" style={{ color: ACCENT }}>
            {formatPrice(product.price)}
            <span className="text-lg ml-1 font-semibold text-gray-400">FCFA</span>
          </span>
          {product.oldPrice && (
            <span className="text-gray-300 line-through text-base mb-1 tabular-nums">{formatPrice(product.oldPrice)} FCFA</span>
          )}
        </div>

        <div className="mt-5">
          <StockBar stock={product.stock ?? 20} sold={product.sold} accent={ACCENT} />
        </div>

        <div className="flex items-center gap-3 mt-7">
          <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}
            onClick={() => addItem({ productId: product.id, name: product.name, brand: product.brand, price: product.price, oldPrice: product.oldPrice, image: product.thumbnails[0] })}
            className="flex-1 inline-flex items-center justify-center gap-2 text-white text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_END})` }}>
            <ShoppingCart size={15} /> Ajouter au panier
          </motion.button>
          <Link to={`/catalogue/${product.id}`}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   SIDE DEAL
───────────────────────────────────────── */
const SIDE_ACCENTS = ['#a855f7', '#0891b2']

function SideDeal({ product, index }: { product: Product; index: number }) {
  const { addItem } = useCart()
  const accent = SIDE_ACCENTS[index % SIDE_ACCENTS.length]
  const disc = product.oldPrice ? discountPct(product.price, product.oldPrice) : 0

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
      className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm flex gap-4 p-5 group">
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-[50px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" style={{ background: accent }} />

      <div className="relative shrink-0 w-[108px] h-[108px] rounded-xl overflow-hidden bg-gray-50">
        <img src={product.thumbnails[0]} alt={product.name} className="w-full h-full object-cover" />
        {disc > 0 && (
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] shadow-md" style={{ background: accent }}>
            -{disc}%
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {product.badge && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mb-2" style={{ background: `${accent}18`, color: accent }}>
              {product.badge === 'hot' ? 'Best-seller' : product.badge === 'new' ? 'Nouveau' : product.badge === 'sale' ? 'Promo' : 'Top noté'}
            </span>
          )}
          <h4 className="text-gray-900 text-[15px] leading-tight">{product.name}</h4>
          <p className="text-gray-400 text-[12px] mt-0.5">{product.brand}</p>
        </div>
        <div>
          <div className="flex items-end gap-1.5 mb-2.5">
            <span className="text-gray-900 text-xl tabular-nums">{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="text-gray-300 line-through text-xs mb-0.5 tabular-nums">{formatPrice(product.oldPrice)}</span>}
            <span className="text-gray-400 text-xs mb-0.5">FCFA</span>
          </div>
          <StockBar stock={product.stock ?? 20} sold={product.sold} accent={accent} />
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => addItem({ productId: product.id, name: product.name, brand: product.brand, price: product.price, oldPrice: product.oldPrice, image: product.thumbnails[0] })}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-lg transition-colors">
            <ShoppingCart size={12} /> Ajouter
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   SECTION PRINCIPALE
───────────────────────────────────────── */
export function DealOfTheDay() {
  /* Vraies promos programmées côté admin (avant = pas encore listé, après = auto-exclu) */
  const { data, isLoading } = useQuery({
    queryKey: ['deals-of-day'],
    queryFn:  fetchActiveDeals,
    staleTime: 30_000,
    refetchInterval: 60_000, // se rafraîchit tout seul quand une promo se termine
  })

  const products: Product[] = (data ?? []).slice(0, 3).map(mapDealProduct)
  const [hero, ...sides] = products
  /* Échéance affichée = fin de la promo qui expire en premier (la liste est déjà triée par saleEndsAt) */
  const nextEndsAt = data?.[0]?.saleEndsAt ?? null
  const { h, m, s } = useCountdown(nextEndsAt)

  // Avant qu'une promo soit programmée, ou après que tout ait expiré : section masquée
  if (!isLoading && !hero) return null

  return (
    <section className="relative py-10 sm:py-16 lg:py-24 overflow-hidden bg-[#f8f9fc]">
      <div className="absolute top-0 left-1/4 w-[500px] h-[350px] bg-orange-400/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-400/8 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-amber-600 text-[11px] font-bold tracking-[0.15em] uppercase">Offre limitée · En cours</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
              Deals{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #f97316, #ef4444)' }}>
                du Jour
              </span>
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-sm leading-relaxed">Stocks limités. Prix garantis jusqu'à la fin du compte à rebours.</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
              <Timer size={12} /> Expire dans
            </div>
            <Countdown h={h} m={m} s={s} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : !hero ? null : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] gap-5">
            <HeroDeal product={hero} />
            <div className="flex flex-col gap-5">
              {sides.map((p, i) => <SideDeal key={p.id} product={p} index={i} />)}
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-orange-100 bg-orange-50 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <BadgePercent size={18} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-semibold">Livraison offerte</p>
                  <p className="text-gray-500 text-xs mt-0.5">Sur toutes les commandes du deal du jour</p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
