import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Heart, ArrowRight, TrendingUp } from 'lucide-react'

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type Product = {
  id: number
  name: string
  category: string
  price: number
  oldPrice?: number
  rating: number
  reviews: number
  image: string
  badge?: { label: string; type: 'hot' | 'new' | 'sale' | 'top' }
  sold?: number
  stock?: number
  href: string
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const TABS = [
  { id: 'all',     label: 'Tout',      icon: <TrendingUp size={13} /> },
  { id: 'tech',    label: 'High-Tech', icon: null },
  { id: 'maison',  label: 'Maison',    icon: null },
  { id: 'beaute',  label: 'Beauté',    icon: null },
  { id: 'sport',   label: 'Sport',     icon: null },
]

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Montre Connectée Pro X7',
    category: 'tech',
    price: 29990,
    oldPrice: 49990,
    rating: 4.8,
    reviews: 2341,
    image: '/flyers/1.png',
    badge: { label: '🔥 Top vente', type: 'hot' },
    sold: 1240,
    stock: 12,
    href: '/catalogue',
  },
  {
    id: 2,
    name: 'Bande LED RGB Ambiance 5M',
    category: 'maison',
    price: 15990,
    oldPrice: 24990,
    rating: 4.6,
    reviews: 876,
    image: '/flyers/1.png',
    badge: { label: 'Nouveau', type: 'new' },
    sold: 534,
    href: '/catalogue',
  },
  {
    id: 3,
    name: 'Pistolet de Massage Musculaire',
    category: 'sport',
    price: 34990,
    oldPrice: 59990,
    rating: 4.9,
    reviews: 1105,
    image: '/flyers/1.png',
    badge: { label: '-41%', type: 'sale' },
    sold: 788,
    stock: 5,
    href: '/catalogue',
  },
  {
    id: 4,
    name: "Humidificateur d'Air Ultrasonique",
    category: 'maison',
    price: 19990,
    oldPrice: 29990,
    rating: 4.7,
    reviews: 643,
    image: '/flyers/1.png',
    badge: { label: 'Top noté', type: 'top' },
    sold: 412,
    href: '/catalogue',
  },
  {
    id: 5,
    name: 'Set 15 Pinceaux Maquillage Pro',
    category: 'beaute',
    price: 12990,
    oldPrice: 19990,
    rating: 4.5,
    reviews: 452,
    image: '/flyers/1.png',
    sold: 328,
    href: '/catalogue',
  },
  {
    id: 6,
    name: 'Support Téléphone Voiture 360°',
    category: 'tech',
    price: 9990,
    oldPrice: 14990,
    rating: 4.6,
    reviews: 1873,
    image: '/flyers/1.png',
    badge: { label: '🔥 Top vente', type: 'hot' },
    sold: 2100,
    href: '/catalogue',
  },
  {
    id: 7,
    name: 'Lampe Bureau LED Architecte',
    category: 'maison',
    price: 22990,
    oldPrice: 34990,
    rating: 4.8,
    reviews: 391,
    image: '/flyers/1.png',
    badge: { label: '-34%', type: 'sale' },
    sold: 267,
    stock: 8,
    href: '/catalogue',
  },
  {
    id: 8,
    name: 'Tapis de Yoga Antidérapant 6mm',
    category: 'sport',
    price: 18990,
    oldPrice: 27990,
    rating: 4.7,
    reviews: 724,
    image: '/flyers/1.png',
    badge: { label: 'Nouveau', type: 'new' },
    sold: 390,
    href: '/catalogue',
  },
]

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function formatPrice(n: number) {
  return (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'
}

function discount(price: number, old: number) {
  return Math.round(((old - price) / old) * 100)
}

/* ─────────────────────────────────────────
   BADGE
───────────────────────────────────────── */
const BADGE_STYLES: Record<string, string> = {
  hot:  'bg-red-500 text-white',
  new:  'bg-emerald-500 text-white',
  sale: 'bg-orange-500 text-white',
  top:  'bg-blue-600 text-white',
}

/* ─────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────── */
function ProductCard({ product, rank }: { product: Product; rank: number }) {
  const [wished, setWished] = useState(false)
  const disc = product.oldPrice ? discount(product.price, product.oldPrice) : 0

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col">

      {/* Image area */}
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>

        {/* Rank badge */}
        <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-gray-900 text-white text-xs  flex items-center justify-center">
          #{rank}
        </div>

        {/* Badge */}
        {product.badge && (
          <div className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] ${BADGE_STYLES[product.badge.type]}`}>
            {product.badge.label}
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={() => setWished(w => !w)}
          className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
        >
          <Heart
            size={15}
            className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>

        {/* Product image */}
        <Link to={product.href}>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">

        {/* Name */}
        <Link to={product.href}>
          <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2 group-hover:text-gray-900">
            {product.name}
          </p>
        </Link>

        {/* Stars */}
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <img
              key={i}
              src="/icons/etoile-doree.png"
              alt=""
              className="w-3.5 h-3.5 object-contain"
              style={{ opacity: i < Math.round(product.rating) ? 1 : 0.2 }}
            />
          ))}
          <span className="text-gray-400 text-xs tabular-nums ml-0.5">
            ({product.reviews.toLocaleString('fr-FR')})
          </span>
        </div>

        {/* Sold count */}
        {product.sold && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-400"
                style={{ width: `${Math.min((product.sold / 2500) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400">{product.sold.toLocaleString('fr-FR')} vendus</span>
          </div>
        )}

        {/* Stock warning */}
        {product.stock && product.stock <= 10 && (
          <p className="text-[11px] text-red-500 font-medium mt-1">
            ⚠ Plus que {product.stock} en stock
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price */}
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg text-gray-900 leading-none">
              {formatPrice(product.price)}
            </p>
            {product.oldPrice && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-gray-400 line-through">{formatPrice(product.oldPrice)}</p>
                <span className="text-xs font-bold text-red-500">-{disc}%</span>
              </div>
            )}
          </div>

          {/* Add to cart */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            <ShoppingCart size={13} />
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   SECTION COMPONENT
───────────────────────────────────────── */
export function BestSellersSection() {
  const [activeTab, setActiveTab] = useState('all')

  const filtered = activeTab === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeTab)

  return (
    <section className="py-10 sm:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-orange-500">
                Tendances du moment
              </span>
            </div>
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              Meilleures ventes
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Produits les plus appréciés par notre communauté
            </p>
          </div>

          {/* View all CTA */}
          <Link
            to="/catalogue"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0"
          >
            Voir tout le catalogue
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Product grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} rank={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
