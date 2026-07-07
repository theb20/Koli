import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingCart, Heart, ArrowRight, TrendingUp, Star, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts, mapApiProduct, toggleWishlist } from '../../lib/api'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'

type Product = ReturnType<typeof mapApiProduct>

const TABS = [
  { id: 'all',      label: 'Tout',      icon: <TrendingUp size={13} /> },
  { id: 'hightech', label: 'High-Tech', icon: null },
  { id: 'maison',   label: 'Maison',    icon: null },
  { id: 'beaute',   label: 'Beauté',    icon: null },
  { id: 'sport',    label: 'Sport',     icon: null },
]

function formatPrice(n: number) {
  return Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
}

function discountPct(price: number, old: number) {
  return Math.round(((old - price) / old) * 100)
}

const BADGE_STYLES: Record<string, string> = {
  hot:  'bg-red-500 text-white',
  new:  'bg-emerald-500 text-white',
  sale: 'bg-orange-500 text-white',
  top:  'bg-blue-600 text-white',
}

function badgeLabel(badge: string, disc: number): string {
  if (badge === 'hot')  return '🔥 Top vente'
  if (badge === 'new')  return 'Nouveau'
  if (badge === 'sale') return `-${disc}%`
  return 'Top noté'
}

/* ─────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────── */
function ProductCard({ product, rank }: { product: Product; rank: number }) {
  const { addItem } = useCart()
  const { token } = useAuth()
  const [imgIdx, setImgIdx] = useState(0)
  const [wished, setWished] = useState(false)
  const [added,  setAdded]  = useState(false)
  const disc = product.oldPrice ? discountPct(product.price, product.oldPrice) : 0
  const href = `/catalogue/${product.id}`

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (product.stock === 0) return
    addItem({
      productId: product.id,
      name:      product.name,
      brand:     product.brand,
      price:     product.price,
      oldPrice:  product.oldPrice,
      image:     product.images[0],
      stock:     product.stock ?? undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleWish = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!token) return
    try {
      await toggleWishlist(product.id, token, wished)
      setWished(w => !w)
    } catch { /* ignore */ }
  }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col">
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>
        <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
          #{rank}
        </div>

        {product.badge && (
          <div className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] ${BADGE_STYLES[product.badge]}`}>
            {badgeLabel(product.badge, disc)}
          </div>
        )}

        <button onClick={handleWish}
          className="absolute bottom-14 right-3 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95">
          <Heart size={15} className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>

        <Link to={href} className="block absolute inset-0 z-[1]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={imgIdx}
              src={product.images[imgIdx]}
              alt={product.name}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </AnimatePresence>
        </Link>

        <div className="absolute bottom-0 inset-x-0 flex items-end justify-center gap-1.5 px-2 pb-2 pt-8
          bg-gradient-to-t from-black/55 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          pointer-events-none group-hover:pointer-events-auto" style={{ zIndex: 15 }}>
          {product.images.slice(0, 4).map((img, i) => (
            <button key={i}
              onMouseEnter={() => setImgIdx(i)}
              onClick={e => { e.preventDefault(); setImgIdx(i) }}
              className={`shrink-0 overflow-hidden rounded-md border-[2px] transition-all duration-150 ${
                i === imgIdx ? 'border-white scale-110 shadow-lg w-9 h-9' : 'border-white/30 opacity-70 hover:opacity-100 hover:border-white/70 w-7 h-7'
              }`}>
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <Link to={href}>
          <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2 group-hover:text-gray-900">
            {product.name}
          </p>
        </Link>

        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < Math.round(product.rating);

            return (
              <Star
                key={i}
                className="w-3.5 h-3.5"
                fill={filled ? "#f59e0b" : "none"}
                stroke={filled ? "#f59e0b" : "#d1d5db"}
              />
            );
          })}
          <span className="text-gray-400 text-xs tabular-nums ml-0.5">({product.reviews.toLocaleString('fr-FR')})</span>
        </div>

        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min((product.sold / 2500) * 100, 100)}%` }} />
          </div>
          <span className="text-[11px] text-gray-400">{product.sold.toLocaleString('fr-FR')} vendus</span>
        </div>

        {product.stock === 0 ? (
          <p className="text-[11px] text-gray-400 font-semibold mt-1">✕ Rupture de stock</p>
        ) : product.stock != null && product.stock <= 10 ? (
          <p className="text-[11px] text-red-500 font-medium mt-1">⚠ Plus que {product.stock} en stock</p>
        ) : null}

        <div className="flex-1" />

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg text-gray-900 leading-none">{formatPrice(product.price)}</p>
            {product.oldPrice && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-gray-400 line-through">{formatPrice(product.oldPrice)}</p>
                <span className="text-xs font-bold text-red-500">{disc}%</span>
              </div>
            )}
          </div>
          <button onClick={handleAdd}
            disabled={product.stock === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              product.stock === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : `active:scale-95 ${added ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`
            }`}>
            <ShoppingCart size={13} />
            {product.stock === 0 ? 'Épuisé' : added ? 'Ajouté !' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   SECTION
───────────────────────────────────────── */
export function BestSellersSection() {
  const [activeTab, setActiveTab] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['bestsellers', activeTab],
    queryFn: () => fetchProducts({
      category: activeTab === 'all' ? undefined : activeTab,
      sort:     'popular',
      limit:    8,
    }),
    staleTime: 5 * 60_000,
  })

  const products: Product[] = (data?.data?.products ?? []).map(mapApiProduct)

  return (
    <section className="py-10 sm:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-orange-500">Tendances du moment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Meilleures ventes</h2>
            <p className="text-gray-500 text-sm mt-1">Produits les plus appréciés par notre communauté</p>
          </div>
          <Link to="/catalogue" className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0">
            Voir tout le catalogue
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Aucun produit dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
