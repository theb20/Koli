import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingCart, ArrowRight, Zap, Timer, BadgePercent,
} from 'lucide-react'
import { Link } from 'react-router-dom'

/* ─────────────────────────────────────────
   COUNTDOWN HOOK
───────────────────────────────────────── */
function useCountdown(targetHours = 6) {
  const [time, setTime] = useState(() => {
    const now = new Date()
    const end = new Date(now)
    end.setHours(now.getHours() + targetHours, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
  })

  useEffect(() => {
    if (time <= 0) return
    const id = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [time])

  const h = String(Math.floor(time / 3600)).padStart(2, '0')
  const m = String(Math.floor((time % 3600) / 60)).padStart(2, '0')
  const s = String(time % 60).padStart(2, '0')
  return { h, m, s, expired: time === 0 }
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const HERO_DEAL = {
  id: 1,
  title: 'Montre Connectée Pro X7',
  subtitle: "Suivi GPS · Fréquence cardiaque · +40 sports · 7 jours d'autonomie",
  image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=90',
  oldPrice: '49 990',
  price: '29 990',
  discount: 40,
  stock: 12,
  sold: 88,
  accent: '#f97316',
  accentEnd: '#ef4444',
  badge: 'Best-seller',
  stars: 4.8,
  reviews: 2340,
}

const SIDE_DEALS = [
  {
    id: 2,
    title: 'Bande LED RGB 5M',
    subtitle: 'Alexa & Google Home',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80',
    oldPrice: '24 990',
    price: '14 990',
    discount: 50,
    stock: 6,
    sold: 134,
    accent: '#a855f7',
    badge: 'Rupture proche',
  },
  {
    id: 3,
    title: 'Pistolet de Massage Pro',
    subtitle: '6 vitesses · USB-C',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80',
    oldPrice: '59 990',
    price: '34 990',
    discount: 41,
    stock: 9,
    sold: 57,
    accent: '#0891b2',
    badge: 'Nouveau',
  },
]

/* ─────────────────────────────────────────
   DIGIT FLIP
───────────────────────────────────────── */
function Digit({ value }: { value: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="inline-block tabular-nums"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

function Countdown({ h, m, s }: { h: string; m: string; s: string }) {
  const units = [
    { v: h, l: 'h' },
    { v: m, l: 'm' },
    { v: s, l: 's' },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {units.map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-gray-900 rounded-xl px-3.5 py-2 min-w-[54px] justify-center shadow-sm">
            <span className="text-white font-black text-lg tracking-tighter overflow-hidden">
              <Digit value={v[0]} />
              <Digit value={v[1]} />
            </span>
            <span className="text-white/50 text-[10px] font-medium ml-0.5">{l}</span>
          </div>
          {i < 2 && <span className="text-gray-300 font-bold text-base">:</span>}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   STARS
───────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm"
          style={{ background: i < Math.floor(rating) ? '#f59e0b' : '#e5e7eb' }}
        />
      ))}
      <span className="text-gray-400 text-[11px] ml-1.5 tabular-nums font-medium">{rating}</span>
    </div>
  )
}

/* ─────────────────────────────────────────
   STOCK BAR
───────────────────────────────────────── */
function StockBar({
  stock, sold, accent,
}: { stock: number; sold: number; accent: string }) {
  const pct = Math.round((stock / (stock + sold)) * 100)
  const low = pct < 20
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-gray-400">{sold} vendus</span>
        <span className={low ? 'text-red-500 ' : 'text-gray-400'}>
          {low && '🔥 '}Il reste {stock}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: accent }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   HERO DEAL CARD
───────────────────────────────────────── */
function HeroDeal() {
  const d = HERO_DEAL
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-sm flex flex-col h-full"
    >
      {/* Subtle glow top-right */}
      <div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none"
        style={{ background: d.accent }}
      />

      {/* Top image area */}
      <div className="relative h-[200px] sm:h-[240px] lg:h-[280px] overflow-hidden bg-gray-50">
        <img
          src={d.image}
          alt={d.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay bottom → white */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-white/60 text-gray-800 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
            <Zap size={10} style={{ color: d.accent }} fill={d.accent} />
            -{d.discount}% aujourd'hui
          </span>
          <span className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-white/60 text-gray-500 text-[11px] px-3 py-1.5 rounded-full shadow-sm">
            {d.badge}
          </span>
        </div>

        {/* Discount badge */}
        <div
          className="absolute top-4 right-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white text-sm shadow-lg"
          style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accentEnd})` }}
        >
          -{d.discount}%
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-7 flex flex-col flex-1">
        <Stars rating={d.stars} />
        <p className="text-gray-400 text-[11px] mt-1 mb-4 tabular-nums">
          {d.reviews.toLocaleString()} avis vérifiés
        </p>

        <h3 className="text-2xl text-gray-900 leading-tight tracking-tight">
          {d.title}
        </h3>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">{d.subtitle}</p>

        {/* Price */}
        <div className="flex items-end gap-3 mt-6">
          <span
            className="text-4xl  tabular-nums"
            style={{ color: d.accent }}
          >
            {d.price}
            <span className="text-lg ml-1 font-semibold text-gray-400">FCFA</span>
          </span>
          <span className="text-gray-300 line-through text-base mb-1 tabular-nums">
            {d.oldPrice} FCFA
          </span>
        </div>

        <div className="mt-5">
          <StockBar stock={d.stock} sold={d.sold} accent={d.accent} />
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 mt-7">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className="flex-1 inline-flex items-center justify-center gap-2 text-white text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accentEnd})` }}
          >
            <ShoppingCart size={15} />
            Ajouter au panier
          </motion.button>
          <Link
            to="/catalogue"
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   SIDE DEAL CARD
───────────────────────────────────────── */
function SideDeal({ deal, index }: { deal: typeof SIDE_DEALS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
      className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm flex gap-4 p-5 group"
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-[50px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
        style={{ background: deal.accent }}
      />

      {/* Image */}
      <div className="relative shrink-0 w-[108px] h-[108px] rounded-xl overflow-hidden bg-gray-50">
        <img
          src={deal.image}
          alt={deal.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px]  shadow-md"
          style={{ background: deal.accent }}
        >
          -{deal.discount}%
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <span
            className="inline-block text-[10px]  px-2 py-0.5 rounded-full mb-2"
            style={{ background: `${deal.accent}18`, color: deal.accent }}
          >
            {deal.badge}
          </span>
          <h4 className="text-gray-900  text-[15px] leading-tight">{deal.title}</h4>
          <p className="text-gray-400 text-[12px] mt-0.5">{deal.subtitle}</p>
        </div>

        <div>
          <div className="flex items-end gap-1.5 mb-2.5">
            <span className="text-gray-900 text-xl tabular-nums">{deal.price}</span>
            <span className="text-gray-300 line-through text-xs mb-0.5 tabular-nums">{deal.oldPrice}</span>
            <span className="text-gray-400 text-xs mb-0.5">FCFA</span>
          </div>
          <StockBar stock={deal.stock} sold={deal.sold} accent={deal.accent} />
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <ShoppingCart size={12} />
            Ajouter
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
  const { h, m, s } = useCountdown(6)

  return (
    <section className="relative py-10 sm:py-16 lg:py-24 overflow-hidden bg-[#f8f9fc]">

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        
      />
      {/* Fade grid at edges */}
      <div className="absolute inset-0  pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[350px] bg-orange-400/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-400/8 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">

          {/* Left: Label + Title */}
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
             
              <span className="text-amber-600 text-[11px] font-bold tracking-[0.15em] uppercase">
                Offre limitée · En cours
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
              Deals{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #f97316, #ef4444)' }}
              >
                du Jour
              </span>
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-sm leading-relaxed">
              Stocks limités. Prix garantis jusqu'à la fin du compte à rebours.
            </p>
          </div>

          {/* Right: Countdown */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
              <Timer size={12} />
              Expire dans
            </div>
            <Countdown h={h} m={m} s={s} />
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] gap-5">
          {/* Hero */}
          <HeroDeal />
          {/* Side deals */}
          <div className="flex flex-col gap-5">
            {SIDE_DEALS.map((d, i) => (
              <SideDeal key={d.id} deal={d} index={i} />
            ))}

            {/* Promo strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-orange-100 bg-orange-50 p-5 flex items-center gap-4"
            >
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

      </div>
    </section>
  )
}
