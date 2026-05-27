import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  SlidersHorizontal, X, ChevronDown, LayoutGrid, LayoutList,
  Heart, ShoppingCart, Star, Search, ChevronLeft, ChevronRight,
  Sparkles, TrendingUp, Zap, RotateCcw, Check, Grid2X2, Grid3X3,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useCart } from '../contexts/CartContext'
import { PRODUCTS, type Badge, type Product } from '../data/products'

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & TYPES
═══════════════════════════════════════════════════════════════ */
const BLUE = '#0421ff'
const PRICE_MAX_LIMIT = 200000

/* ─── Categories ─── */
const CATEGORIES = [
  { id: 'all',      label: 'Tout le catalogue', icon: '🛍️' },
  { id: 'hightech', label: 'High-Tech',          icon: '📱' },
  { id: 'maison',   label: 'Maison & Décoration',icon: '🏠' },
  { id: 'beaute',   label: 'Beauté & Soins',     icon: '✨' },
  { id: 'sport',    label: 'Sport & Fitness',     icon: '💪' },
  { id: 'mode',     label: 'Mode & Accessoires',  icon: '👗' },
  { id: 'jeux',     label: 'Jeux & Loisirs',      icon: '🎮' },
]

const SORT_OPTIONS = [
  { id: 'popular',   label: 'Popularité',  icon: TrendingUp },
  { id: 'newest',    label: 'Nouveautés',  icon: Sparkles   },
  { id: 'price-asc', label: 'Prix ↑',      icon: null       },
  { id: 'price-desc',label: 'Prix ↓',      icon: null       },
  { id: 'rating',    label: 'Mieux notés', icon: Star       },
]

const BADGE_FILTERS: { id: Badge; label: string; color: string; bg: string }[] = [
  { id: 'sale', label: 'En promo',   color: '#f97316', bg: '#fff7ed' },
  { id: 'new',  label: 'Nouveauté', color: '#10b981', bg: '#ecfdf5' },
  { id: 'hot',  label: 'Top vente', color: '#ef4444', bg: '#fef2f2' },
  { id: 'top',  label: 'Top noté',  color: '#3b82f6', bg: '#eff6ff' },
]

const BADGE_STYLE: Record<Badge, string> = {
  hot:  'bg-red-500 text-white',
  new:  'bg-emerald-500 text-white',
  sale: 'bg-orange-500 text-white',
  top:  'bg-blue-600 text-white',
}

/* ─── Helpers ─── */
const fmt  = (n: number) => (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'
const disc = (p: number, o: number) => Math.round(((o - p) / o) * 100)
const catCount = (id: string) => id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.category === id).length

/* ═══════════════════════════════════════════════════════════════
   PRICE RANGE SLIDER
═══════════════════════════════════════════════════════════════ */
function PriceSlider({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const minPct = (min / PRICE_MAX_LIMIT) * 100
  const maxPct = (max / PRICE_MAX_LIMIT) * 100
  return (
    <div className="pt-2 pb-1">
      <div className="flex justify-between mb-3 text-xs font-semibold text-gray-700">
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-100" />
        <div className="absolute h-1.5 rounded-full" style={{ left:`${minPct}%`, right:`${100-maxPct}%`, background:BLUE }} />
        <input type="range" min={0} max={PRICE_MAX_LIMIT} step={1000} value={min}
          onChange={e => { const v=+e.target.value; if(v<max-5000) onChange(v,max) }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5" style={{zIndex: min>PRICE_MAX_LIMIT-10000?5:3}} />
        <input type="range" min={0} max={PRICE_MAX_LIMIT} step={1000} value={max}
          onChange={e => { const v=+e.target.value; if(v>min+5000) onChange(min,v) }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5" style={{zIndex:4}} />
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ left:`calc(${minPct}% - 8px)`, background:BLUE }} />
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ left:`calc(${maxPct}% - 8px)`, background:BLUE }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FILTER PANEL
═══════════════════════════════════════════════════════════════ */
function FilterPanel({
  category, setCategory, priceMin, priceMax, setPriceRange,
  minRating, setMinRating, badges, toggleBadge, onReset,
}: {
  category: string; setCategory: (c: string) => void
  priceMin: number; priceMax: number; setPriceRange: (mn: number, mx: number) => void
  minRating: number; setMinRating: (r: number) => void
  badges: Badge[]; toggleBadge: (b: Badge) => void; onReset: () => void
}) {
  return (
    <div className="space-y-7">
      {/* Categories */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Catégories</p>
        <div className="space-y-0.5">
          {CATEGORIES.map(cat => {
            const active = category === cat.id
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 ${active?'font-semibold text-gray-900':'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                style={{ background: active?`${BLUE}0D`:'' }}
              >
                <span className="flex items-center gap-2.5"><span className="text-base leading-none">{cat.icon}</span>{cat.label}</span>
                <span className="text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[22px] text-center"
                  style={{ background:active?`${BLUE}18`:'#f3f4f6', color:active?BLUE:'#9ca3af' }}>
                  {catCount(cat.id)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="h-px bg-gray-100" />
      {/* Price */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Fourchette de prix</p>
        <PriceSlider min={priceMin} max={priceMax} onChange={setPriceRange} />
      </div>
      <div className="h-px bg-gray-100" />
      {/* Rating */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Note minimale</p>
        <div className="flex items-center gap-1.5">
          {[0,3,4,4.5].map(r => (
            <button key={r} onClick={() => setMinRating(r)}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all ${minRating===r?'border-yellow-400 bg-yellow-50 text-yellow-700':'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>
              {r===0?'Tous':<><Star size={10} className="fill-yellow-400 text-yellow-400"/>{r}+</>}
            </button>
          ))}
        </div>
      </div>
      <div className="h-px bg-gray-100" />
      {/* Badges */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Filtres spéciaux</p>
        <div className="space-y-2">
          {BADGE_FILTERS.map(bf => {
            const active = badges.includes(bf.id)
            return (
              <label key={bf.id} className="flex items-center gap-3 cursor-pointer group">
                <span onClick={() => toggleBadge(bf.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${active?'border-transparent':'border-gray-200 group-hover:border-gray-300'}`}
                  style={{ background: active?bf.color:'' }}>
                  {active && <Check size={11} className="text-white" strokeWidth={3}/>}
                </span>
                <span onClick={() => toggleBadge(bf.id)} className="flex items-center gap-1.5 text-sm" style={{ color:active?bf.color:'#6b7280' }}>
                  <span className="h-2 w-2 rounded-full" style={{ background:bf.color }}/>{bf.label}
                </span>
              </label>
            )
          })}
        </div>
      </div>
      <button onClick={onReset}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all">
        <RotateCcw size={13}/> Réinitialiser
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE GALLERY THUMBNAIL STRIP — partagé par Grid & List
═══════════════════════════════════════════════════════════════ */
function ThumbStrip({ images, active, onHover }: { images: string[]; active: number; onHover: (i: number) => void }) {
  return (
    <div className="flex items-end justify-center gap-1.5 px-2 pb-2 pt-6
                    bg-gradient-to-t from-black/55 to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    absolute inset-x-0 bottom-0 pointer-events-none group-hover:pointer-events-auto">
      {images.map((img, i) => (
        <button
          key={i}
          onMouseEnter={() => onHover(i)}
          onClick={e => { e.preventDefault(); onHover(i) }}
          className={`shrink-0 overflow-hidden rounded-md border-[2px] transition-all duration-150 ${
            i === active
              ? 'border-white scale-110 shadow-lg w-9 h-9'
              : 'border-white/30 opacity-70 hover:opacity-100 hover:border-white/70 w-7 h-7'
          }`}
        >
          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GRID CARD
═══════════════════════════════════════════════════════════════ */
function GridCard({ p, idx }: { p: Product; idx: number }) {
  const { addItem } = useCart()
  const [imgIdx, setImgIdx] = useState(0)
  const [wished, setWished] = useState(false)
  const [added,  setAdded]  = useState(false)
  const discount = p.oldPrice ? disc(p.price, p.oldPrice) : 0
  const soldPct  = Math.min(100, (p.sold / 2500) * 100)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({ productId: p.id, name: p.name, brand: p.brand, price: p.price, oldPrice: p.oldPrice, image: p.images[0] })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-white rounded-2xl border border-gray-100
                 hover:border-transparent hover:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)]
                 transition-all duration-300 flex flex-col overflow-hidden"
    >
      {/* Full-card link overlay — sits below all interactive elements */}
      <Link to={`/catalogue/${p.id}`} className="absolute inset-0 z-[1]" aria-label={p.name} />

      {/* ── Image area ── */}
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio:'1/1' }}>

        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {p.badge && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE_STYLE[p.badge]}`}>
              {p.badge==='hot'?'🔥 Top':p.badge==='new'?'✨ Nouveau':p.badge==='sale'?`-${discount}%`:'⭐ Top noté'}
            </span>
          )}
          {p.stock && p.stock<=5 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
              ⚡ {p.stock} restants
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button onClick={() => setWished(w => !w)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow-sm
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-all hover:scale-110 active:scale-95">
          <Heart size={14} className={wished?'fill-red-500 text-red-500':'text-gray-400'}/>
        </button>

        {/* Main image — crossfade entre les 4 */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={imgIdx}
            src={p.images[imgIdx]}
            alt={p.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 w-full h-full object-cover
                       group-hover:scale-[1.04] transition-transform duration-500"
            loading="lazy"
          />
        </AnimatePresence>

        {/* 4 thumbnails — apparaissent au survol */}
        <ThumbStrip images={p.images} active={imgIdx} onHover={setImgIdx} />

        {/* Add-to-cart overlay */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
             style={{ zIndex: 20 }}>
          <button onClick={handleAdd}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white transition-colors"
            style={{ background: added?'#10b981':BLUE }}>
            {added?<><Check size={15} strokeWidth={2.5}/> Ajouté !</>:<><ShoppingCart size={15}/> Ajouter au panier</>}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1">{p.brand}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 flex-1 mb-2">{p.name}</p>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-2">
          {Array.from({length:5}).map((_,i) => (
            <Star key={i} size={11} className={i<Math.round(p.rating)?'fill-yellow-400 text-yellow-400':'fill-gray-100 text-gray-100'}/>
          ))}
          <span className="text-[11px] text-gray-400 ml-0.5">{p.rating} ({p.reviews.toLocaleString('fr-FR')})</span>
        </div>

        {/* Sold progress */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-orange-400" style={{ width:`${soldPct}%` }}/>
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{p.sold.toLocaleString('fr-FR')} vendus</span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-base font-black text-gray-900 leading-none">{fmt(p.price)}</p>
            {p.oldPrice && <p className="text-[11px] text-gray-400 line-through mt-0.5">{fmt(p.oldPrice)}</p>}
          </div>
          {discount>0 && <span className="text-xs font-black text-red-500">-{discount}%</span>}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LIST CARD
═══════════════════════════════════════════════════════════════ */
function ListCard({ p, idx }: { p: Product; idx: number }) {
  const { addItem } = useCart()
  const [imgIdx, setImgIdx] = useState(0)
  const [wished, setWished] = useState(false)
  const [added,  setAdded]  = useState(false)
  const discount = p.oldPrice ? disc(p.price, p.oldPrice) : 0

  const handleAdd = () => {
    addItem({ productId: p.id, name: p.name, brand: p.brand, price: p.price, oldPrice: p.oldPrice, image: p.images[0] })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, delay: idx * 0.04 }}
      className="group relative flex gap-4 sm:gap-6 bg-white rounded-2xl border border-gray-100
                 hover:border-transparent hover:shadow-[0_4px_30px_-6px_rgba(0,0,0,0.12)]
                 transition-all duration-300 p-3 sm:p-4"
    >
      {/* Full-card link overlay */}
      <Link to={`/catalogue/${p.id}`} className="absolute inset-0 z-[1] rounded-2xl" aria-label={p.name} />

      {/* Image + thumbnails */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-gray-50">
          {p.badge && (
            <span className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${BADGE_STYLE[p.badge]}`}>
              {p.badge==='sale'?`-${discount}%`:p.badge==='new'?'Nouveau':p.badge==='hot'?'🔥':'⭐'}
            </span>
          )}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img key={imgIdx} src={p.images[imgIdx]} alt={p.name}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </AnimatePresence>
        </div>

        {/* 4 mini-thumbnails sous l'image principale */}
        <div className="flex gap-1 w-28 sm:w-36">
          {p.images.map((img, i) => (
            <button key={i}
              onMouseEnter={() => setImgIdx(i)}
              onClick={() => setImgIdx(i)}
              className={`flex-1 aspect-square rounded-md overflow-hidden border-[1.5px] transition-all ${
                i===imgIdx?'border-blue-500 opacity-100':'border-gray-200 opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"/>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">{p.brand}</p>
        <p className="text-sm sm:text-base font-semibold text-gray-800 leading-snug mt-0.5 line-clamp-2">{p.name}</p>

        <div className="flex items-center gap-1 mt-1.5">
          {Array.from({length:5}).map((_,i)=>(
            <Star key={i} size={11} className={i<Math.round(p.rating)?'fill-yellow-400 text-yellow-400':'fill-gray-100 text-gray-100'}/>
          ))}
          <span className="text-[11px] text-gray-400 ml-1">{p.rating} · {p.reviews.toLocaleString('fr-FR')} avis</span>
        </div>

        {p.stock && p.stock<=10 && (
          <span className="mt-1.5 text-[11px] font-medium text-red-500">⚡ Plus que {p.stock} en stock</span>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            <p className="text-base sm:text-lg font-black text-gray-900">{fmt(p.price)}</p>
            {p.oldPrice && (
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-400 line-through">{fmt(p.oldPrice)}</p>
                {discount>0 && <span className="text-xs font-bold text-red-500">-{discount}%</span>}
              </div>
            )}
          </div>
          <div className="relative z-[2] flex items-center gap-2">
            <button onClick={()=>setWished(w=>!w)} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center hover:border-red-200 transition-colors">
              <Heart size={15} className={wished?'fill-red-500 text-red-500':'text-gray-400'}/>
            </button>
            <button onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background:added?'#10b981':BLUE }}>
              {added?<><Check size={13}/> Ajouté</>:<><ShoppingCart size={13}/> Ajouter</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════ */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl mb-4">🔍</span>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun produit trouvé</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">Essayez d'ajuster vos filtres ou explorez d'autres catégories.</p>
      <button onClick={onReset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background:BLUE }}>
        <RotateCcw size={14}/> Réinitialiser les filtres
      </button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [category,  setCategory]  = useState(searchParams.get('cat')    ?? 'all')
  const [sortBy,    setSortBy]    = useState(searchParams.get('sort')   ?? 'popular')
  const [priceMin,  setPriceMin]  = useState(+(searchParams.get('pmin') ?? 0))
  const [priceMax,  setPriceMax]  = useState(+(searchParams.get('pmax') ?? PRICE_MAX_LIMIT))
  const [minRating, setMinRating] = useState(+(searchParams.get('rating') ?? 0))
  const [badges,    setBadges]    = useState<Badge[]>((searchParams.get('badges')?.split(',').filter(Boolean) ?? []) as Badge[])
  const [search,    setSearch]    = useState(searchParams.get('q') ?? '')
  const [viewMode,  setViewMode]  = useState<'grid'|'list'>('grid')
  const [gridCols,  setGridCols]  = useState<3|4>(3)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortOpen,  setSortOpen]  = useState(false)
  const [page,      setPage]      = useState(1)
  const PER_PAGE = 12
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p: Record<string,string> = {}
    if (category!=='all')          p.cat    = category
    if (sortBy!=='popular')        p.sort   = sortBy
    if (priceMin>0)                p.pmin   = String(priceMin)
    if (priceMax<PRICE_MAX_LIMIT)  p.pmax   = String(priceMax)
    if (minRating>0)               p.rating = String(minRating)
    if (badges.length)             p.badges = badges.join(',')
    if (search)                    p.q      = search
    setSearchParams(p, { replace:true })
    setPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortBy, priceMin, priceMax, minRating, badges, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileFiltersOpen])

  const toggleBadge  = useCallback((b: Badge) => setBadges(prev => prev.includes(b)?prev.filter(x=>x!==b):[...prev,b]), [])
  const setPriceRange = useCallback((min: number, max: number) => { setPriceMin(min); setPriceMax(max) }, [])
  const resetFilters  = useCallback(() => {
    setCategory('all'); setSortBy('popular')
    setPriceMin(0); setPriceMax(PRICE_MAX_LIMIT)
    setMinRating(0); setBadges([]); setSearch('')
  }, [])

  const filtered = useMemo(() => {
    let list = PRODUCTS
    if (category!=='all') list = list.filter(p => p.category===category)
    if (search)           list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase())||p.brand.toLowerCase().includes(search.toLowerCase()))
    list = list.filter(p => p.price>=priceMin && p.price<=priceMax)
    if (minRating>0)      list = list.filter(p => p.rating>=minRating)
    if (badges.length)    list = list.filter(p => p.badge && badges.includes(p.badge))
    switch (sortBy) {
      case 'price-asc':  return [...list].sort((a,b)=>a.price-b.price)
      case 'price-desc': return [...list].sort((a,b)=>b.price-a.price)
      case 'rating':     return [...list].sort((a,b)=>b.rating-a.rating)
      case 'newest':     return [...list].sort((a,b)=>(b.isNew?1:0)-(a.isNew?1:0))
      default:           return [...list].sort((a,b)=>b.sold-a.sold)
    }
  }, [category, search, priceMin, priceMax, minRating, badges, sortBy])

  const totalPages = Math.ceil(filtered.length/PER_PAGE)
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const activeFilterCount = [
    category!=='all', priceMin>0||priceMax<PRICE_MAX_LIMIT,
    minRating>0, badges.length>0, search.length>0,
  ].filter(Boolean).length

  const currentCat = CATEGORIES.find(c=>c.id===category) ?? CATEGORIES[0]
  const sortLabel  = SORT_OPTIONS.find(s=>s.id===sortBy)?.label ?? 'Popularité'

  return (
    <>
      <PageMeta
        title={`Catalogue${category!=='all'?` — ${currentCat.label}`:''}`}
        description="Explorez notre catalogue complet : high-tech, maison, beauté, sport, mode et jeux. Filtrez par prix, note et promotion."
        path="/catalogue"
      />

      <div className="min-h-screen bg-gray-50/50">

        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden bg-gray-900">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-transparent z-10"/>
            {category!=='all' && (
              <img src={PRODUCTS.find(p=>p.category===category)?.images[0]} alt=""
                className="w-full h-full object-cover opacity-30"/>
            )}
          </div>
          <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
            <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
              <span className="hover:text-white cursor-pointer transition-colors" onClick={()=>setCategory('all')}>Catalogue</span>
              {category!=='all'&&<><span>/</span><span className="text-white">{currentCat.label}</span></>}
            </nav>
            <div className="flex items-end gap-6">
              <div>
                <span className="text-4xl mb-3 block">{currentCat.icon}</span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{currentCat.label}</h1>
                <p className="text-gray-400 text-sm mt-1">{filtered.length} produit{filtered.length!==1?'s':''} disponible{filtered.length!==1?'s':''}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 flex-wrap ml-auto">
                {CATEGORIES.slice(1).map(cat=>(
                  <button key={cat.id} onClick={()=>setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${category===cat.id?'bg-white text-gray-900':'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky search ── */}
        <div className="bg-white border-b border-gray-100 sticky top-[60px] sm:top-[108px] md:top-[156px] z-30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={`Rechercher dans ${currentCat.label.toLowerCase()}…`}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-gray-300 focus:bg-white transition-all"/>
              {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400 hover:text-gray-600"/></button>}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex gap-8">

            {/* ── Sidebar ── */}
            <aside className="hidden lg:block w-60 xl:w-64 shrink-0">
              <div className="sticky top-[220px] bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-gray-900 text-sm">Filtres</p>
                  {activeFilterCount>0&&<span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{background:BLUE}}>{activeFilterCount}</span>}
                </div>
                <FilterPanel category={category} setCategory={setCategory}
                  priceMin={priceMin} priceMax={priceMax} setPriceRange={setPriceRange}
                  minRating={minRating} setMinRating={setMinRating}
                  badges={badges} toggleBadge={toggleBadge} onReset={resetFilters}/>
              </div>
            </aside>

            {/* ── Content ── */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {filtered.length} <span className="font-normal text-gray-400">produits</span>
                  </span>
                  {search&&<span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">«{search}»<button onClick={()=>setSearch('')}><X size={11}/></button></span>}
                  {(priceMin>0||priceMax<PRICE_MAX_LIMIT)&&<span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">{fmt(priceMin)} – {fmt(priceMax)}<button onClick={()=>setPriceRange(0,PRICE_MAX_LIMIT)}><X size={11}/></button></span>}
                  {minRating>0&&<span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-xs text-yellow-700"><Star size={10} className="fill-yellow-400 text-yellow-400"/> {minRating}+<button onClick={()=>setMinRating(0)}><X size={11}/></button></span>}
                  {badges.map(b=>{const bf=BADGE_FILTERS.find(f=>f.id===b)!;return(
                    <span key={b} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{background:bf.bg,color:bf.color}}>
                      {bf.label}<button onClick={()=>toggleBadge(b)}><X size={11}/></button>
                    </span>
                  )})}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Mobile filters */}
                  <button onClick={()=>setMobileFiltersOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-gray-300 transition-colors">
                    <SlidersHorizontal size={14}/> Filtres
                    {activeFilterCount>0&&<span className="h-4 w-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{background:BLUE}}>{activeFilterCount}</span>}
                  </button>

                  {/* Sort */}
                  <div ref={sortRef} className="relative">
                    <button onClick={()=>setSortOpen(v=>!v)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-300 transition-colors bg-white">
                      <span className="hidden sm:inline">{sortLabel}</span>
                      <span className="sm:hidden">Trier</span>
                      <ChevronDown size={13} className={`transition-transform ${sortOpen?'rotate-180':''}`}/>
                    </button>
                    <AnimatePresence>
                      {sortOpen&&(
                        <motion.div initial={{opacity:0,y:6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6,scale:0.97}} transition={{duration:0.15}}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl py-1.5 z-50">
                          {SORT_OPTIONS.map(opt=>(
                            <button key={opt.id} onClick={()=>{setSortBy(opt.id);setSortOpen(false)}}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${sortBy===opt.id?'font-semibold text-gray-900':'text-gray-500 hover:bg-gray-50'}`}>
                              {sortBy===opt.id&&<Check size={12} style={{color:BLUE}} strokeWidth={3}/>}
                              {opt.icon&&<opt.icon size={13} className="text-gray-400"/>}
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* View mode */}
                  <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-gray-100 bg-white">
                    {(['grid','list'] as const).map(m=>(
                      <button key={m} onClick={()=>setViewMode(m)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{background:viewMode===m?BLUE:'',color:viewMode===m?'#fff':'#9ca3af'}}>
                        {m==='grid'?<LayoutGrid size={15}/>:<LayoutList size={15}/>}
                      </button>
                    ))}
                  </div>

                  {/* Grid density */}
                  {viewMode==='grid'&&(
                    <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl border border-gray-100 bg-white">
                      {([3,4] as const).map(c=>(
                        <button key={c} onClick={()=>setGridCols(c)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{background:gridCols===c?BLUE:'',color:gridCols===c?'#fff':'#9ca3af'}}>
                          {c===3?<Grid3X3 size={15}/>:<Grid2X2 size={15}/>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid / List */}
              <AnimatePresence mode="wait">
                {paginated.length===0?(
                  <EmptyState key="empty" onReset={resetFilters}/>
                ):viewMode==='grid'?(
                  <motion.div key={`grid-${category}-${page}`}
                    className={`grid gap-4 sm:gap-5 grid-cols-2 ${gridCols===4?'lg:grid-cols-4':'lg:grid-cols-3'}`}>
                    {paginated.map((p,i)=><GridCard key={p.id} p={p} idx={i}/>)}
                  </motion.div>
                ):(
                  <motion.div key={`list-${category}-${page}`} className="space-y-3">
                    {paginated.map((p,i)=><ListCard key={p.id} p={p} idx={i}/>)}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pagination */}
              {totalPages>1&&(
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={()=>{setPage(p=>Math.max(1,p-1));window.scrollTo({top:0,behavior:'smooth'})}} disabled={page===1}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 disabled:opacity-30 hover:border-gray-300 transition-all">
                    <ChevronLeft size={14}/> Préc.
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({length:totalPages}).map((_,i)=>{
                      const pg=i+1; const isActive=pg===page
                      const show=pg===1||pg===totalPages||Math.abs(pg-page)<=1
                      if(!show&&(pg===2||pg===totalPages-1)) return <span key={pg} className="text-gray-300 text-xs">…</span>
                      if(!show) return null
                      return(
                        <button key={pg} onClick={()=>{setPage(pg);window.scrollTo({top:0,behavior:'smooth'})}}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${isActive?'text-white shadow-sm':'text-gray-500 hover:bg-gray-100'}`}
                          style={{background:isActive?BLUE:''}}>
                          {pg}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={()=>{setPage(p=>Math.min(totalPages,p+1));window.scrollTo({top:0,behavior:'smooth'})}} disabled={page===totalPages}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 disabled:opacity-30 hover:border-gray-300 transition-all">
                    Suiv. <ChevronRight size={14}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      <AnimatePresence>
        {mobileFiltersOpen&&(
          <>
            <motion.div key="bd" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setMobileFiltersOpen(false)} className="lg:hidden fixed inset-0 z-[60] bg-black/40"/>
            <motion.div key="dr" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',damping:30,stiffness:300}}
              className="lg:hidden fixed inset-x-0 bottom-0 z-[61] bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200"/></div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-gray-600"/>
                  <span className="font-bold text-gray-900">Filtres</span>
                  {activeFilterCount>0&&<span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{background:BLUE}}>{activeFilterCount}</span>}
                </div>
                <button onClick={()=>setMobileFiltersOpen(false)}><X size={20} className="text-gray-400"/></button>
              </div>
              <div className="px-5 py-5">
                <FilterPanel category={category} setCategory={c=>{setCategory(c);setMobileFiltersOpen(false)}}
                  priceMin={priceMin} priceMax={priceMax} setPriceRange={setPriceRange}
                  minRating={minRating} setMinRating={setMinRating}
                  badges={badges} toggleBadge={toggleBadge}
                  onReset={()=>{resetFilters();setMobileFiltersOpen(false)}}/>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
                <button onClick={()=>setMobileFiltersOpen(false)}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white" style={{background:BLUE}}>
                  Voir {filtered.length} produit{filtered.length!==1?'s':''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Promo quick-filter FAB */}
      <AnimatePresence>
        {!mobileFiltersOpen&&(
          <motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
            onClick={()=>{toggleBadge('sale');setPage(1)}}
            className="lg:hidden fixed bottom-24 right-4 z-40 flex items-center gap-1.5 px-3 py-2.5 rounded-full shadow-xl text-xs font-bold text-white"
            style={{background:badges.includes('sale')?'#10b981':'#f97316'}}>
            <Zap size={13}/>{badges.includes('sale')?'Promos ON':'Promos'}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
