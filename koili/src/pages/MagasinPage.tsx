import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, SlidersHorizontal, Star, Truck,
  Shield, RotateCcw, Zap, TrendingUp, Package,
  ShoppingCart, Heart, ArrowRight, Check, Grid3X3, List,
} from 'lucide-react'
import { PRODUCTS } from '../data/products'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings, waLink } from '../hooks/useSiteSettings'

/* ═══════════════════════════════════════════════════════════════
   DONNÉES
═══════════════════════════════════════════════════════════════ */
const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

const CATEGORIES = [
  { id: 'all',      label: 'Tout',            icon: '🏪', count: PRODUCTS.length },
  { id: 'hightech', label: 'High-Tech',        icon: '📱', count: PRODUCTS.filter(p=>p.category==='hightech').length },
  { id: 'maison',   label: 'Maison',           icon: '🏠', count: PRODUCTS.filter(p=>p.category==='maison').length   },
  { id: 'beaute',   label: 'Beauté',           icon: '✨', count: PRODUCTS.filter(p=>p.category==='beaute').length   },
  { id: 'sport',    label: 'Sport',            icon: '💪', count: PRODUCTS.filter(p=>p.category==='sport').length    },
]

const BRANDS = [
  { name: 'Apple',    logo: 'https://logo.clearbit.com/apple.com'    },
  { name: 'Samsung',  logo: 'https://logo.clearbit.com/samsung.com'  },
  { name: 'Sony',     logo: 'https://logo.clearbit.com/sony.com'     },
  { name: 'Nike',     logo: 'https://logo.clearbit.com/nike.com'     },
  { name: 'Adidas',   logo: 'https://logo.clearbit.com/adidas.com'   },
  { name: 'Xiaomi',   logo: 'https://logo.clearbit.com/mi.com'       },
]

const SORT_OPTIONS = [
  { value: 'popular',  label: 'Les plus populaires' },
  { value: 'newest',   label: 'Nouveautés'          },
  { value: 'price_asc',label: 'Prix croissant'      },
  { value: 'price_desc',label: 'Prix décroissant'   },
  { value: 'rating',   label: 'Mieux notés'         },
]


function ProductCard({ product, rank, view }: { product: typeof PRODUCTS[0]; rank?: number; view: 'grid' | 'list' }) {
  const { addItem } = useCart()
  const [wished, setWished] = useState(false)
  const [added,  setAdded]  = useState(false)
  const disc = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (product.stock === 0) return
    addItem({ productId: product.id, name: product.name, brand: product.brand, price: product.price, oldPrice: product.oldPrice, image: product.images[0], stock: product.stock ?? undefined })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  if (view === 'list') {
    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex gap-4 p-4">
        <Link to={`/catalogue/${product.id}`} className="shrink-0">
          <img src={product.images[0]} alt={product.name} className="w-24 h-24 rounded-xl object-cover bg-gray-50" />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{product.brand}</p>
          <Link to={`/catalogue/${product.id}`}>
            <p className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">{product.name}</p>
          </Link>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({length:5}).map((_,i)=>(
              <Star key={i} size={11} className={i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
            ))}
            <span className="text-xs text-gray-400 ml-1">({product.reviews.toLocaleString('fr-FR')})</span>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2">
            <div>
              <p className="text-base font-bold text-gray-900">{fmt(product.price)}</p>
              {product.oldPrice && <p className="text-xs text-gray-400 line-through">{fmt(product.oldPrice)}</p>}
            </div>
            <button onClick={handleAdd}
              disabled={product.stock === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                product.stock === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : `active:scale-95 ${added ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`
              }`}>
              {product.stock === 0 ? <><ShoppingCart size={12}/>Épuisé</> : added ? <><Check size={12}/>Ajouté !</> : <><ShoppingCart size={12}/>Ajouter</>}
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all overflow-hidden flex flex-col">
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>
        {rank && (
          <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold">
            #{rank}
          </div>
        )}
        {disc > 0 && (
          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            -{disc}%
          </div>
        )}
        {product.badge && !disc && (
          <div className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            product.badge === 'hot' ? 'bg-red-500 text-white' :
            product.badge === 'new' ? 'bg-emerald-500 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {product.badge === 'hot' ? '🔥 Top' : product.badge === 'new' ? 'Nouveau' : '⭐ Top noté'}
          </div>
        )}
        <button onClick={() => setWished(w => !w)}
          className="absolute bottom-12 right-3 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
          <Heart size={14} className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
        <Link to={`/catalogue/${product.id}`} className="absolute inset-0 z-[1]">
          <img src={product.images[0]} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </Link>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{product.brand}</p>
        <Link to={`/catalogue/${product.id}`}>
          <p className="text-sm font-semibold text-gray-800 line-clamp-2 mt-0.5 leading-snug hover:text-blue-600 transition-colors">{product.name}</p>
        </Link>
        <div className="flex items-center gap-0.5 mt-1.5">
          {Array.from({length:5}).map((_,i)=>(
            <Star key={i} size={11} className={i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">({product.reviews.toLocaleString('fr-FR')})</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-base font-bold text-gray-900">{fmt(product.price)}</p>
            {product.oldPrice && (
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-400 line-through">{fmt(product.oldPrice)}</p>
                <span className="text-xs font-bold text-red-500">-{disc}%</span>
              </div>
            )}
          </div>
          <button onClick={handleAdd}
            disabled={product.stock === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              product.stock === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : `active:scale-95 ${added ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`
            }`}>
            {product.stock === 0 ? <><ShoppingCart size={11}/>Épuisé</> : added ? <><Check size={11}/> Ajouté !</> : <><ShoppingCart size={11}/> Ajouter</>}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function MagasinPage() {
  const settings = useSiteSettings()
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('all')
  const [sort,     setSort]     = useState('popular')
  const [view,     setView]     = useState<'grid' | 'list'>('grid')
  const [priceMax, setPriceMax] = useState(50000) // budget max par défaut : 50 000 FCFA

  /* Filtrage */
  const filtered = PRODUCTS
    .filter(p => {
      if (category !== 'all' && p.category !== category) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false
      if (p.price > priceMax) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'price_asc')  return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      if (sort === 'rating')     return b.rating - a.rating
      if (sort === 'newest')     return b.id - a.id
      return b.sold - a.sold
    })

  const hasActiveFilter = category !== 'all' || search !== '' || priceMax !== 50000

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white overflow-hidden">
        {/* déco orbes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-emerald-600/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Package size={13} className="text-white" />
                </div>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Notre magasin</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-4">
                Tout ce dont vous
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400">
                  avez besoin
                </span>
              </h1>
              <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                {PRODUCTS.length} produits soigneusement sélectionnés, livrés partout au Cameroun en 24 à 72h.
              </p>
              {/* Search hero */}
              <div className="mt-6 flex gap-3 max-w-md">
                <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm focus-within:bg-white/15 transition-colors">
                  <Search size={16} className="text-gray-400 shrink-0" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un produit, une marque…"
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none" />
                </div>
                <Link to="/catalogue"
                  className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                  Catalogue <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:w-80">
              {[
                { value: PRODUCTS.length, suffix: '+', label: 'Produits disponibles', icon: '📦' },
                { value: 48,              suffix: 'h',  label: 'Livraison max',        icon: '🚚' },
                { value: 12000,           suffix: '+',  label: 'Clients satisfaits',   icon: '⭐' },
                { value: 4,               suffix: ' villes', label: 'Régions livrées', icon: '📍' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-black text-white">{s.value}{s.suffix}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Garanties strip */}
        <div className="relative border-t border-white/10 bg-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center sm:justify-between gap-4 sm:gap-8 overflow-x-auto text-xs text-gray-400 flex-wrap">
              {[
                { icon: <Truck size={13} />,     label: 'Livraison 24–72h partout'     },
                { icon: <RotateCcw size={13} />, label: 'Retours gratuits 30 jours'    },
                { icon: <Shield size={13} />,    label: 'Paiement 100% sécurisé'       },
                { icon: <Zap size={13} />,       label: 'Orange Money · Wave · MTN'    },
              ].map(g => (
                <div key={g.label} className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <span className="text-blue-400">{g.icon}</span>
                  {g.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATÉGORIES ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all shrink-0 ${
                  category === cat.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}>
                <span>{cat.icon}</span>
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  category === cat.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── VITRINE MARQUES ── */}
      <section className="bg-white py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest text-center mb-5">Marques disponibles</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {BRANDS.map(brand => (
              <div key={brand.name} className="flex items-center justify-center w-16 h-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUITS + FILTRES ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 items-start">

          {/* ─── Sidebar filtres ─── */}
          <div className="hidden lg:block sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal size={14} /> Filtres
              </p>
            </div>

            <div className="p-5 space-y-6">
              {/* Catégorie */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Catégorie</p>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        category === cat.id ? 'bg-gray-900 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <span className="flex items-center gap-2">{cat.icon} {cat.label}</span>
                      <span className={`text-xs ${category === cat.id ? 'text-white/70' : 'text-gray-400'}`}>{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix max */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Budget maximum</p>
                <div className="px-1">
                  <input type="range" min={1000} max={50000} step={1000} value={priceMax}
                    onChange={e => setPriceMax(Number(e.target.value))}
                    className="w-full accent-gray-900 cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 000 FCFA</span>
                    <span className="font-bold text-gray-800">{priceMax.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</span>
                    <span>50 000 FCFA</span>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Disponibilité</p>
                {['En stock', 'En promotion', 'Nouveautés', 'Top ventes'].map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 group-hover:border-gray-500 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{opt}</span>
                  </label>
                ))}
              </div>

              {/* Note */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Note minimale</p>
                {[4, 3, 2].map(r => (
                  <label key={r} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-gray-500 transition-colors" />
                    <div className="flex items-center gap-1">
                      {Array.from({length:5}).map((_,i)=>(
                        <Star key={i} size={12} className={i < r ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                      ))}
                      <span className="text-xs text-gray-500">& plus</span>
                    </div>
                  </label>
                ))}
              </div>

              {hasActiveFilter && (
                <button onClick={() => { setCategory('all'); setSearch(''); setPriceMax(500000) }}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-red-500 transition-colors">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* ─── Grille produits ─── */}
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-bold text-gray-900">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</p>
                {hasActiveFilter && <p className="text-xs text-gray-400">Filtres actifs</p>}
              </div>
              <div className="flex items-center gap-3">
                {/* Sort */}
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-gray-400 transition-colors">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {/* View toggle */}
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button onClick={() => setView('grid')}
                    className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Grid3X3 size={14} />
                  </button>
                  <button onClick={() => setView('list')}
                    className={`p-2.5 transition-colors ${view === 'list' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Search bar mobile */}
            <div className="lg:hidden mb-4 flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="flex-1 text-sm focus:outline-none placeholder:text-gray-300" />
              </div>
            </div>

            {/* Grille / Liste */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <Package size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">Aucun produit ne correspond à votre recherche.</p>
                <button onClick={() => { setCategory('all'); setSearch(''); setPriceMax(500000) }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                  Réinitialiser
                </button>
              </div>
            ) : (
              <div className={view === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'flex flex-col gap-3'}>
                <AnimatePresence>
                  {filtered.map((p, i) => (
                    <ProductCard key={p.id} product={p} rank={i + 1} view={view} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MEILLEURES VENTES ── */}
      <section className="bg-white border-t border-gray-100 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 flex items-center gap-1.5">
                <TrendingUp size={13} /> Tendances
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">Les plus populaires</h2>
            </div>
            <Link to="/catalogue" className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
              Tout voir <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...PRODUCTS].sort((a,b)=>b.sold-a.sold).slice(0,8).map((p,i)=>(
              <ProductCard key={p.id} product={p} rank={i+1} view="grid" />
            ))}
          </div>
        </div>
      </section>

      {/* ── BANNIÈRE CTA ── */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 py-14 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">Vous ne trouvez pas ce que vous cherchez ?</h2>
            <p className="text-gray-400 mt-1">Contactez-nous, nous pouvons sourcer n'importe quel produit pour vous.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/contact"
              className="px-5 py-3 rounded-xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Nous contacter
            </Link>
            <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-600 transition-colors flex items-center gap-2">
              💬 WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
