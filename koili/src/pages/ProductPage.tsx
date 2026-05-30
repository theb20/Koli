import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, ChevronRight, Heart, ShoppingCart, Star,
  Shield, Truck, RotateCcw, Zap, Share2, Check,
  ChevronDown, ArrowLeft, Package, ThumbsUp, Loader2,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchProduct, fetchProducts, fetchReviews,
  mapApiProduct, toggleWishlist, submitReview,
  API_BASE, type ApiReview,
} from '../lib/api'

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

/* ─── Types locaux ────────────────────────────────────────────── */
export type Product = ReturnType<typeof mapApiProduct>

type Review = {
  id: string; author: string; avatar: string; rating: number
  date: string; title: string; body?: string | null; helpful: number
  verified: boolean
}

/** Convertit un ApiReview vers le type Review local */
function mapReview(r: ApiReview): Review {
  const prenom = r.user?.prenom ?? 'Anonyme'
  const nom    = r.user?.nom ?? ''
  return {
    id:       r.id,
    author:   `${prenom} ${nom ? nom[0] + '.' : ''}`.trim(),
    avatar:   `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase(),
    rating:   r.rating,
    date:     new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    title:    r.title ?? '',
    body:     r.body,
    helpful:  r.helpful,
    verified: r.verified,
  }
}

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
  const [helped,    setHelped]    = useState(false)
  const [helpCount, setHelpCount] = useState(review.helpful)

  const handleHelpful = async () => {
    if (helped) return          // un seul vote par session
    setHelped(true)
    setHelpCount(c => c + 1)
    try {
      await fetch(`${API_BASE}/api/reviews/${review.id}/helpful`, { method: 'POST' })
    } catch { /* déjà mis à jour localement, pas critique */ }
  }

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

          {/* Helpful — persiste en base */}
          <button
            onClick={handleHelpful}
            disabled={helped}
            className={`mt-3 inline-flex items-center gap-1.5 text-xs transition-colors disabled:cursor-default ${
              helped ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ThumbsUp size={12} strokeWidth={helped ? 0 : 1.5} className={helped ? 'fill-blue-600' : ''} />
            Utile ({helpCount})
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LEAVE A REVIEW FORM
═══════════════════════════════════════════════════════════════ */
function ReviewForm({ productId, onSubmit }: { productId: number; onSubmit: () => void }) {
  const { token, isAuthenticated, user } = useAuth()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [hover,  setHover]  = useState(0)
  const [picked, setPicked] = useState(0)
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [sent,   setSent]   = useState(false)
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  /* ── Utilisateur non connecté → invite à se connecter ── */
  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <Star size={22} className="text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Connectez-vous pour laisser un avis</p>
          <p className="text-xs text-gray-400 mt-1">Seuls les utilisateurs connectés peuvent publier un avis.</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Se connecter
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked) { setError('Choisissez une note.'); return }
    if (body.trim().length < 10) { setError('Votre commentaire doit faire au moins 10 caractères.'); return }
    setError('')
    setLoading(true)
    try {
      await submitReview({ productId, rating: picked, title: title.trim() || undefined, body: body.trim() }, token!)
      setSent(true)
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      setTimeout(onSubmit, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setLoading(false)
    }
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

  const initials = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Auteur — affiché automatiquement */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user.avatar
            ? <img src={user.avatar} alt={user.prenom} className="w-full h-full object-cover rounded-full" />
            : initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{user.prenom} {user.nom}</p>
          <p className="text-[11px] text-gray-400">Votre avis sera publié sous ce nom</p>
        </div>
      </div>

      {/* Star picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Votre note <span className="text-red-400">*</span>
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

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Titre de votre avis
        </label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex : Très bon rapport qualité-prix"
          maxLength={100}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Votre commentaire <span className="text-red-400">*</span>
        </label>
        <textarea
          value={body} onChange={e => { setBody(e.target.value); if (error) setError('') }} rows={4}
          placeholder="Décrivez votre expérience : qualité, livraison, utilisation... (min. 10 caractères)"
          maxLength={2000}
          className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition resize-none ${
            error && body.trim().length < 10 ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
          }`}
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[11px] ${body.trim().length < 10 && body.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {body.length}/2000 {body.trim().length < 10 && body.length > 0 ? `(encore ${10 - body.trim().length} car.)` : ''}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
          ⚠ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!picked || body.trim().length < 10 || loading}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
          bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Publication…' : 'Publier mon avis'}
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
function RelatedCard({ product }: { product: ReturnType<typeof mapApiProduct> }) {
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
  const { token, isAuthenticated } = useAuth()
  const { addItem } = useCart()

  /* ── Data fetching ── */
  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => fetchProduct(id!, token),
    enabled:  !!id,
  })

  // Le backend retourne { product, similar, inWishlist }
  const product    = productData?.data?.product ? mapApiProduct(productData.data.product) : null
  const inWishlist = productData?.data?.inWishlist ?? false

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id ? Number(id) : 0],
    queryFn:  () => fetchReviews(id!),
    enabled:  !!id,
  })

  const { data: relatedData } = useQuery({
    queryKey: ['products-related', product?.category],
    queryFn:  () => fetchProducts({ category: product?.category, limit: 5 }, token),
    enabled:  !!product?.category,
  })

  const reviews = (reviewsData?.data.reviews ?? []).map(mapReview)
  // Utilise d'abord les similaires renvoyés par /api/products/:id, sinon la requête séparée
  const similar = (productData?.data?.similar ?? []).map(mapApiProduct).filter(p => p.id !== product?.id)
  const related = similar.length
    ? similar.slice(0, 4)
    : (relatedData?.data.products ?? []).map(mapApiProduct).filter(p => p.id !== product?.id).slice(0, 4)

  /* ── Local state ── */
  const [qty, setQty]             = useState(1)
  const [wished, setWished]       = useState(inWishlist)
  const [addedCart, setAddedCart] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Description')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [color, setColor]         = useState(0)
  const [shared, setShared]       = useState(false)
  const reviewRef = useRef<HTMLDivElement>(null)

  // Synchronise l'état wishlist dès que la réponse API arrive
  useEffect(() => { setWished(inWishlist) }, [inWishlist])

  /* ── Loading / Error / 404 ── */
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (isError || !product) {
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

  /* Wishlist handler */
  const handleWish = async () => {
    if (!isAuthenticated || !token) return
    const next = !wished
    setWished(next)
    try {
      await toggleWishlist(product.id, token, !next)
    } catch {
      setWished(!next)
    }
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
      stock: product.stock ?? undefined,
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
                    <span className="text-sm text-red-500 leading-tight">{d}%</span>
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
                  {product.stock !== null && product.stock > 0 && product.stock <= 10 && (
                    <p className="text-xs text-orange-500 font-semibold">
                      ⚠ Plus que {product.stock} en stock
                    </p>
                  )}
                  {product.stock !== null && product.stock === 0 && (
                    <p className="text-xs text-red-600 font-bold">
                      ✕ Rupture de stock
                    </p>
                  )}
                </div>
              </div>

              {/* CTA row */}
              <div className="flex gap-3 mb-5">
                <motion.button
                  onClick={handleAddCart}
                  disabled={product.stock !== null && product.stock === 0}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all ${
                    product.stock !== null && product.stock === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : addedCart
                        ? 'bg-emerald-500 text-white'
                        : 'text-white hover:opacity-90'
                  }`}
                  style={{ background: (product.stock !== null && product.stock === 0) || addedCart ? undefined : BLUE }}
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
                  onClick={handleWish}
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
              {product.stock !== null && product.stock === 0 ? (
                <div className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-400 mb-6 flex items-center justify-center gap-2 bg-gray-50 cursor-not-allowed select-none">
                  Rupture de stock
                </div>
              ) : (
                <button
                  onClick={() => {
                    addItem({
                      productId: product.id,
                      name:      product.name,
                      brand:     product.brand,
                      price:     product.price,
                      oldPrice:  product.oldPrice,
                      image:     product.images[0],
                      color:     product.colors?.[color],
                      stock:     product.stock ?? undefined,
                    }, qty)
                    navigate('/panier')
                  }}
                  className="w-full py-3.5 rounded-2xl border-2 border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-all mb-6 flex items-center justify-center gap-2"
                >
                  <Zap size={14} />
                  Acheter maintenant
                </button>
              )}

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
                    {reviews.length > 0 && (
                      <div className="p-6 rounded-2xl bg-gray-50 mb-8">
                        <RatingBreakdown reviews={reviews} />
                      </div>
                    )}

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
                              <ReviewForm productId={product.id} onSubmit={() => setShowReviewForm(false)} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Review list */}
                    {reviews.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Star size={32} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-sm">Aucun avis pour l'instant. Soyez le premier !</p>
                      </div>
                    ) : (
                      <div>
                        {reviews.map(r => (
                          <ReviewCard key={r.id} review={r} />
                        ))}
                      </div>
                    )}
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
