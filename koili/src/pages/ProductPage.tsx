import { useState, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, ChevronRight, Heart, ShoppingCart, Star,
  Shield, Truck, RotateCcw, Zap, Share2, Check,
  ChevronDown, ArrowLeft, Package, ThumbsUp,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { getProduct, getRelated, type Product } from '../data/products'
import { useCart } from '../contexts/CartContext'

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const BLUE = '#0421ff'
const fmt = (n: number) =>
  (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'
const disc = (p: number, o: number) => Math.round(((o - p) / o) * 100)

const BADGE_LABEL: Record<string, string> = {
  hot: '🔥 Top vente', new: 'Nouveau', sale: 'Promo', top: '⭐ Top noté',
}
const BADGE_STYLE: Record<string, string> = {
  hot: 'bg-red-500 text-white',
  new: 'bg-emerald-500 text-white',
  sale: 'bg-orange-500 text-white',
  top: 'bg-blue-600 text-white',
}

/* ═══════════════════════════════════════════════════════════════
   FAKE REVIEWS DATA
═══════════════════════════════════════════════════════════════ */
type Review = {
  id: number; author: string; avatar: string; rating: number
  date: string; title: string; body: string; helpful: number
  verified: boolean
}

const REVIEWS_BASE: Review[] = [
  {
    id: 1, author: 'Kouamé A.', avatar: 'KA', rating: 5,
    date: '12 mai 2025', title: 'Exactement ce que je cherchais !',
    body: 'Livraison rapide, produit conforme à la description. La qualité est vraiment au rendez-vous et l\'emballage était parfait. Je recommande fortement ce vendeur.',
    helpful: 24, verified: true,
  },
  {
    id: 2, author: 'Fatima D.', avatar: 'FD', rating: 4,
    date: '3 avril 2025', title: 'Très bon rapport qualité-prix',
    body: 'Produit de bonne qualité pour ce prix. La mise en route est simple et le manuel est clair. Je retire une étoile car la notice est uniquement en anglais.',
    helpful: 11, verified: true,
  },
  {
    id: 3, author: 'Jean-Marc B.', avatar: 'JB', rating: 5,
    date: '28 mars 2025', title: 'Bluffant !',
    body: 'Je suis agréablement surpris par la qualité de fabrication. Beaucoup mieux que les photos. L\'autonomie est exactement celle annoncée. Parfait.',
    helpful: 18, verified: false,
  },
  {
    id: 4, author: 'Aïssatou K.', avatar: 'AK', rating: 3,
    date: '15 mars 2025', title: 'Bien mais quelques défauts',
    body: 'Le produit fonctionne correctement mais j\'ai eu un problème de charge la première semaine. Le SAV a été réactif et a résolu le problème rapidement.',
    helpful: 7, verified: true,
  },
  {
    id: 5, author: 'Thierry M.', avatar: 'TM', rating: 5,
    date: '2 mars 2025', title: 'Achat parfait',
    body: 'Second achat sur ce site, toujours aussi satisfait. Le produit est top, la livraison express J+1 à Abidjan c\'est vraiment un plus. Merci !',
    helpful: 31, verified: true,
  },
]

/* ═══════════════════════════════════════════════════════════════
   STAR RATING BAR
═══════════════════════════════════════════════════════════════ */
function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const counts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100),
  }))
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
      {/* Big score */}
      <div className="text-center shrink-0">
        <p className="text-6xl font-black text-gray-900 leading-none">{avg.toFixed(1)}</p>
        <div className="flex items-center justify-center gap-0.5 mt-2">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={14}
              className={i <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{reviews.length} avis</p>
      </div>

      {/* Bars */}
      <div className="flex-1 space-y-2 w-full">
        {counts.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2.5">
            <span className="text-xs text-gray-500 w-3 shrink-0">{star}</span>
            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-400"
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: (5 - star) * 0.08 }}
              />
            </div>
            <span className="text-xs text-gray-400 w-5 text-right shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REVIEW CARD
═══════════════════════════════════════════════════════════════ */
function ReviewCard({ review }: { review: Review }) {
  const [helped, setHelped] = useState(false)
  const count = helped ? review.helpful + 1 : review.helpful

  return (
    <div className="py-6 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0">
          {review.avatar}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
            <span className="text-sm font-semibold text-gray-800">{review.author}</span>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <Check size={10} strokeWidth={3} /> Achat vérifié
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{review.date}</span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={12}
                className={i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
              />
            ))}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-gray-800 mb-1">{review.title}</p>

          {/* Body */}
          <p className="text-sm text-gray-500 leading-relaxed">{review.body}</p>

          {/* Helpful */}
          <button
            onClick={() => setHelped(h => !h)}
            className={`mt-3 inline-flex items-center gap-1.5 text-xs transition-colors ${
              helped ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ThumbsUp size={12} strokeWidth={helped ? 0 : 1.5} className={helped ? 'fill-blue-600' : ''} />
            Utile ({count})
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LEAVE A REVIEW FORM
═══════════════════════════════════════════════════════════════ */
function ReviewForm({ onSubmit }: { onSubmit: () => void }) {
  const [hover, setHover] = useState(0)
  const [picked, setPicked] = useState(0)
  const [name, setName]   = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody]   = useState('')
  const [sent, setSent]   = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked || !name.trim() || !body.trim()) return
    setSent(true)
    setTimeout(onSubmit, 1800)
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <Check size={26} className="text-emerald-500" strokeWidth={2.5} />
        </div>
        <p className="text-base font-semibold text-gray-800">Merci pour votre avis !</p>
        <p className="text-sm text-gray-400">Il sera publié après validation sous 24h.</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Star picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Votre note
        </label>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <button
              key={i} type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setPicked(i)}
              className="transition-transform hover:scale-125 active:scale-95"
            >
              <Star
                size={28}
                className={`transition-colors ${
                  i <= (hover || picked)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200 fill-gray-200'
                }`}
              />
            </button>
          ))}
          {picked > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'][picked]}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Votre prénom
        </label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Ex : Kouamé A."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Titre de votre avis
        </label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex : Très bon rapport qualité-prix"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Votre commentaire
        </label>
        <textarea
          value={body} onChange={e => setBody(e.target.value)} rows={4}
          placeholder="Décrivez votre expérience : qualité, livraison, utilisation..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!picked || !name.trim() || !body.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all
          bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
      >
        Publier mon avis
      </button>
    </form>
  )
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE GALLERY
═══════════════════════════════════════════════════════════════ */
function ImageGallery({ images, name }: { images: [string,string,string,string]; name: string }) {
  const [idx, setIdx] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const prev = () => setIdx(i => (i - 1 + 4) % 4)
  const next = () => setIdx(i => (i + 1) % 4)

  return (
    <>
      {/* Main image */}
      <div
        className="relative overflow-hidden rounded-2xl bg-gray-50 cursor-zoom-in"
        style={{ aspectRatio: '1/1' }}
        onClick={() => setZoomed(true)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={idx}
            src={images[idx]}
            alt={name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Nav arrows */}
        <button onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:bg-white transition">
          <ChevronLeft size={18} className="text-gray-700" />
        </button>
        <button onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:bg-white transition">
          <ChevronRight size={18} className="text-gray-700" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`rounded-full transition-all ${i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`relative overflow-hidden rounded-xl border-2 transition-all ${
              i === idx ? 'border-gray-900 shadow-sm' : 'border-gray-100 hover:border-gray-300'
            }`}
            style={{ aspectRatio: '1/1' }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              src={images[idx]}
              alt={name}
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setZoomed(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xl font-light">
              ✕
            </button>
            <button onClick={e => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
              <ChevronLeft size={22} />
            </button>
            <button onClick={e => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
              <ChevronRight size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   RELATED PRODUCT CARD
═══════════════════════════════════════════════════════════════ */
function RelatedCard({ product }: { product: Product }) {
  const [imgIdx, setImgIdx] = useState(0)
  const d = product.oldPrice ? disc(product.price, product.oldPrice) : 0
  return (
    <Link to={`/catalogue/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-gray-50 mb-3" style={{ aspectRatio: '1/1' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={imgIdx}
            src={product.images[imgIdx]}
            alt={product.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </AnimatePresence>
        {/* thumb strip */}
        <div className="absolute bottom-0 inset-x-0 flex justify-center gap-1 pb-2 pt-6
                        bg-gradient-to-t from-black/40 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity">
          {product.images.map((_, i) => (
            <button key={i}
              onMouseEnter={() => setImgIdx(i)}
              onClick={e => { e.preventDefault(); setImgIdx(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-0.5">{product.brand}</p>
      <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
        {product.name}
      </p>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="text-sm  text-gray-900">{fmt(product.price)}</span>
        {product.oldPrice && <span className="text-xs text-red-500 font-semibold">-{d}%</span>}
      </div>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRUST BADGE ROW
═══════════════════════════════════════════════════════════════ */
const TRUST = [
  { Icon: Truck,    label: 'Livraison J+1 à Abidjan' },
  { Icon: RotateCcw,label: 'Retour 30 jours' },
  { Icon: Shield,   label: 'Paiement sécurisé' },
  { Icon: Package,  label: 'Emballage soigné' },
]

/* ═══════════════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════════════ */
const TABS = ['Description', 'Spécifications', 'Livraison & Retour', 'Avis'] as const
type Tab = typeof TABS[number]

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const product = getProduct(Number(id))
  const related = product ? getRelated(product, 4) : []

  const { addItem } = useCart()

  /* local state */
  const [qty, setQty]             = useState(1)
  const [wished, setWished]       = useState(false)
  const [addedCart, setAddedCart] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Description')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [color, setColor]         = useState(0)
  const [shared, setShared]       = useState(false)
  const reviewRef = useRef<HTMLDivElement>(null)

  /* 404 */
  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-6xl">😕</p>
        <p className="text-xl text-gray-900">Produit introuvable</p>
        <p className="text-gray-500 text-sm">Ce produit n'existe pas ou a été retiré.</p>
        <button onClick={() => navigate('/catalogue')}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition">
          <ArrowLeft size={15} /> Retour au catalogue
        </button>
      </div>
    )
  }

  const d = product.oldPrice ? disc(product.price, product.oldPrice) : 0

  const handleAddCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.images[0],
      color: product.colors?.[color],
    }, qty)
    setAddedCart(true)
    setTimeout(() => setAddedCart(false), 2200)
  }

  /* ── Share : Web Share API → clipboard → execCommand ── */
  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description?.slice(0, 100), url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        /* Fallback HTTP-safe */
        const el = document.createElement('input')
        el.value = url
        el.style.position = 'fixed'
        el.style.opacity  = '0'
        document.body.appendChild(el)
        el.focus(); el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
    } catch { /* annulé par l'utilisateur ou erreur silencieuse */ }
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const scrollToReviews = () => {
    setActiveTab('Avis')
    reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <PageMeta
        title={product.name}
        description={product.description?.slice(0, 155)}
        image={product.images[0]}
        path={`/catalogue/${product.id}`}
        type="website"
      />

      <div className="bg-white min-h-screen">

        {/* ── Breadcrumb ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
            <Link to="/" className="hover:text-gray-700 transition-colors">Accueil</Link>
            <ChevronRight size={12} />
            <Link to="/catalogue" className="hover:text-gray-700 transition-colors">Catalogue</Link>
            <ChevronRight size={12} />
            <span className="text-gray-600 font-medium line-clamp-1">{product.name}</span>
          </nav>
        </div>

        {/* ── Hero: gallery + info ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-14">

            {/* Left: gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <ImageGallery images={product.images} name={product.name} />
            </motion.div>

            {/* Right: info panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              className="flex flex-col"
            >
              {/* Brand + badges row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {product.brand}
                </span>
                {product.badge && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${BADGE_STYLE[product.badge]}`}>
                    {BADGE_LABEL[product.badge]}
                  </span>
                )}
                {product.isNew && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500 text-white">
                    Nouveau
                  </span>
                )}
              </div>

              {/* Name */}
              <h1 className="text-2xl sm:text-3xl  text-gray-900 leading-tight mb-4">
                {product.name}
              </h1>

              {/* Rating + reviews */}
              <button onClick={scrollToReviews} className="flex items-center gap-2 mb-5 group w-fit">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={14}
                      className={i <= Math.round(product.rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-800">{product.rating}</span>
                <span className="text-sm text-gray-400 group-hover:text-blue-600 transition-colors underline underline-offset-2">
                  ({product.reviews.toLocaleString('fr-FR')} avis)
                </span>
                {product.sold && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    · {product.sold.toLocaleString('fr-FR')} vendus
                  </span>
                )}
              </button>

              {/* Price */}
              <div className="flex items-end gap-4 mb-2">
                <p className="text-4xl text-gray-900">{fmt(product.price)}</p>
                {product.oldPrice && (
                  <div className="flex flex-col items-start pb-1">
                    <span className="text-sm text-gray-400 line-through leading-none">{fmt(product.oldPrice)}</span>
                    <span className="text-sm text-red-500 leading-tight">-{d}%</span>
                  </div>
                )}
              </div>
              {product.oldPrice && (
                <p className="text-xs text-emerald-600 font-semibold mb-5">
                  Vous économisez {fmt(product.oldPrice - product.price)} 🎉
                </p>
              )}

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-5" />

              {/* Color picker */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Couleur
                  </p>
                  <div className="flex items-center gap-2">
                    {product.colors.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setColor(i)}
                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                          i === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                        }`}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Quantité
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition text-lg font-light"
                    >−</button>
                    <span className="w-10 text-center text-sm font-semibold text-gray-800">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock ?? 99, q + 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition text-lg font-light"
                    >+</button>
                  </div>
                  {product.stock && product.stock <= 10 && (
                    <p className="text-xs text-red-500 font-semibold">
                      ⚠ Plus que {product.stock} en stock
                    </p>
                  )}
                </div>
              </div>

              {/* CTA row */}
              <div className="flex gap-3 mb-5">
                <motion.button
                  onClick={handleAddCart}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all ${
                    addedCart
                      ? 'bg-emerald-500 text-white'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={{ background: addedCart ? undefined : BLUE }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {addedCart ? (
                      <motion.span key="check"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Check size={16} strokeWidth={2.5} /> Ajouté !
                      </motion.span>
                    ) : (
                      <motion.span key="cart"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart size={16} /> Ajouter au panier
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <button
                  onClick={() => setWished(w => !w)}
                  className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                    wished ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Heart size={18}
                    className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                  />
                </button>

                <button
                  onClick={handleShare}
                  className="w-12 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-all hover:scale-105 active:scale-95 relative"
                >
                  <AnimatePresence mode="wait">
                    {shared ? (
                      <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check size={16} className="text-emerald-500" />
                      </motion.span>
                    ) : (
                      <motion.span key="sh" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Share2 size={16} className="text-gray-400" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Buy now */}
              <button
                className="w-full py-3.5 rounded-2xl border-2 border-gray-900 text-sm text-gray-900 hover:bg-gray-900 hover:text-white transition-all mb-6"
              >
                <Zap size={14} className="inline mr-1.5" />
                Acheter maintenant
              </button>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3">
                {TRUST.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50">
                    <Icon size={15} className="text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-600 font-medium leading-snug">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Tabs section ── */}
        <div className="border-t border-gray-100 mt-8" ref={reviewRef}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Tab bar */}
            <div className="flex items-center gap-0 overflow-x-auto border-b border-gray-100">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === activeTab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {tab}
                  {tab === activeTab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="py-10"
              >

                {/* ── Description ── */}
                {activeTab === 'Description' && (
                  <div className="max-w-3xl">
                    <p className="text-base text-gray-600 leading-relaxed">
                      {product.description ?? 'Aucune description disponible.'}
                    </p>

                    {/* Feature highlights */}
                    <div className="mt-8 grid sm:grid-cols-3 gap-4">
                      {[
                        { icon: '⚡', title: 'Performance', text: 'Conçu pour les exigeants, testé dans des conditions réelles.' },
                        { icon: '🛡️', title: 'Fiabilité', text: 'Matériaux premium, certification qualité internationale.' },
                        { icon: '📦', title: 'Prêt à l\'emploi', text: 'Tous les accessoires inclus dans la boîte.' },
                      ].map(f => (
                        <div key={f.title} className="rounded-xl bg-gray-50 p-5">
                          <p className="text-2xl mb-2">{f.icon}</p>
                          <p className="text-sm font-semibold text-gray-800 mb-1">{f.title}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{f.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Spécifications ── */}
                {activeTab === 'Spécifications' && (
                  <div className="max-w-2xl">
                    {product.specs && product.specs.length > 0 ? (
                      <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                        {product.specs.map((s, i) => (
                          <div
                            key={i}
                            className={`flex gap-4 px-5 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                          >
                            <dt className="text-sm text-gray-500 w-36 shrink-0">{s.label}</dt>
                            <dd className="text-sm font-medium text-gray-800">{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-gray-400 text-sm">Aucune spécification disponible.</p>
                    )}
                  </div>
                )}

                {/* ── Livraison & Retour ── */}
                {activeTab === 'Livraison & Retour' && (
                  <div className="max-w-2xl space-y-6">
                    {[
                      {
                        icon: Truck, title: 'Livraison standard — 2 à 5 jours ouvrés',
                        text: 'Disponible partout en Côte d\'Ivoire. Frais calculés à la commande selon votre adresse de livraison. Vous recevez un SMS de suivi dès l\'expédition.',
                        tag: 'À partir de 1 500 FCFA',
                      },
                      {
                        icon: Zap, title: 'Livraison express — J+1 à Abidjan',
                        text: 'Commande avant 14h, livraison le lendemain dans Abidjan. Nos livreurs partenaires vous contactent une heure avant le passage.',
                        tag: 'À partir de 3 500 FCFA',
                      },
                      {
                        icon: RotateCcw, title: 'Retour & remboursement — 30 jours',
                        text: 'Produit non conforme ou défectueux ? Renvoyez-le sous 30 jours. Frais de retour offerts si le défaut est avéré. Remboursement sous 3 à 5 jours ouvrés via le même moyen de paiement.',
                        tag: 'Gratuit si défaut avéré',
                      },
                    ].map(({ icon: Icon, title, text, tag }) => (
                      <div key={title} className="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 mb-1">{title}</p>
                          <p className="text-sm text-gray-500 leading-relaxed mb-2">{text}</p>
                          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                            {tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Avis ── */}
                {activeTab === 'Avis' && (
                  <div className="max-w-3xl">

                    {/* Rating overview */}
                    <div className="p-6 rounded-2xl bg-gray-50 mb-8">
                      <RatingBreakdown reviews={REVIEWS_BASE} />
                    </div>

                    {/* Write review toggle */}
                    <div className="mb-8">
                      <button
                        onClick={() => setShowReviewForm(f => !f)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        <Star size={15} className="text-amber-400 fill-amber-400" />
                        Laisser un avis
                        <ChevronDown
                          size={15}
                          className={`text-gray-400 transition-transform ${showReviewForm ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <AnimatePresence>
                        {showReviewForm && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-5 p-6 rounded-2xl border border-gray-100 bg-white">
                              <ReviewForm onSubmit={() => setShowReviewForm(false)} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Review list */}
                    <div>
                      {REVIEWS_BASE.map(r => (
                        <ReviewCard key={r.id} review={r} />
                      ))}
                    </div>

                    {/* Load more */}
                    <button className="mt-6 w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all">
                      Afficher plus d'avis ({product.reviews - REVIEWS_BASE.length})
                    </button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div className="border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-xl text-gray-900">Vous aimerez aussi</h2>
                <Link
                  to={`/catalogue?cat=${product.category}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Voir tout →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {related.map(p => <RelatedCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
