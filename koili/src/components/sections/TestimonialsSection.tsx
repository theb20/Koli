'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatedTooltip } from '../ui/animated-tooltip'
import { CardStack, Highlight } from '../ui/card-stack'
import FlipText from '../ui/FlipText'
import { CommentModal } from '../ui/fromComment'
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
  type Variants,
} from 'motion/react'
import {
  Star,
  ThumbsUp,
  MessageCircle,
  ShieldCheck,
  Award,
  Users,
  Truck,
  Filter as FilterIcon,
  Sparkles,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Heart,
} from 'lucide-react'

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type Review = {
  id: number
  name: string
  location: string
  avatar: string
  color: string
  rating: number
  date: string
  daysAgo: number
  text: string
  verified: boolean
  product?: string
  helpful: number
  photos: number
  recommend: boolean
  merchantReply?: {
    name: string
    date: string
    text: string
  }
  featured?: boolean
}

type SortKey = 'recent' | 'helpful' | 'rating-high' | 'rating-low'
type FilterKey = 'all' | 5 | 4 | 3 | 2 | 1

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const REVIEWS: Review[] = [
  {
    id: 1,
    name: 'Amara K.',
    location: 'Abidjan, CI',
    avatar: 'AK',
    color: '#4F46E5',
    rating: 5,
    date: 'Il y a 3 jours',
    daysAgo: 3,
    text: "Livraison ultra rapide, le produit correspond exactement à la description. La montre connectée est superbe, l'écran est lumineux et les fonctionnalités sont top. Je recommande fortement !",
    verified: true,
    product: 'Montre Connectée Pro X7',
    helpful: 47,
    photos: 3,
    recommend: true,
    featured: true,
    merchantReply: {
      name: 'Service Client',
      date: 'Il y a 2 jours',
      text: 'Merci Amara pour votre retour ! Ravis que la montre vous plaise. À très bientôt !',
    },
  },
  {
    id: 2,
    name: 'Kofi B.',
    location: 'Dakar, SN',
    avatar: 'KB',
    color: '#059669',
    rating: 5,
    date: 'Il y a 1 semaine',
    daysAgo: 7,
    text: "Service client très réactif. J'avais une question sur mon colis et j'ai eu une réponse en moins d'une heure. Le pistolet de massage est vraiment efficace, parfait après le sport.",
    verified: true,
    product: 'Pistolet de Massage Musculaire',
    helpful: 32,
    photos: 2,
    recommend: true,
  },
  {
    id: 3,
    name: 'Fatou D.',
    location: 'Lomé, TG',
    avatar: 'FD',
    color: '#DC2626',
    rating: 4,
    date: 'Il y a 2 semaines',
    daysAgo: 14,
    text: "Les pinceaux maquillage sont de très bonne qualité pour le prix. Le rendu est professionnel. Seul bémol : le packaging aurait pu être plus soigné. Sinon tout est parfait !",
    verified: true,
    product: 'Set 15 Pinceaux Maquillage Pro',
    helpful: 18,
    photos: 0,
    recommend: true,
  },
  {
    id: 4,
    name: 'Samuel N.',
    location: 'Cotonou, BJ',
    avatar: 'SN',
    color: '#D97706',
    rating: 5,
    date: 'Il y a 3 semaines',
    daysAgo: 21,
    text: "Commande reçue en 4 jours, emballage soigné et produit de qualité. Les bandes LED illuminent parfaitement ma chambre. Je suis client depuis 6 mois et je n'ai jamais été déçu.",
    verified: true,
    product: 'Bande LED RGB Ambiance 5M',
    helpful: 29,
    photos: 4,
    recommend: true,
  },
  {
    id: 5,
    name: 'Mariama S.',
    location: 'Bamako, ML',
    avatar: 'MS',
    color: '#7C3AED',
    rating: 5,
    date: 'Il y a 1 mois',
    daysAgo: 30,
    text: "Site très facile à utiliser, paiement sécurisé et livraison dans les délais. L'humidificateur fonctionne parfaitement, la chambre de ma fille sent bon et l'air est plus agréable.",
    verified: true,
    product: "Humidificateur d'Air Ultrasonique",
    helpful: 24,
    photos: 1,
    recommend: true,
  },
  {
    id: 6,
    name: 'Théodore M.',
    location: 'Yaoundé, CM',
    avatar: 'TM',
    color: '#0891B2',
    rating: 4,
    date: 'Il y a 1 mois',
    daysAgo: 32,
    text: "Très bon rapport qualité-prix. Le tapis de yoga est épais et antidérapant comme promis. Je l'utilise quotidiennement depuis un mois sans aucun signe d'usure. Achat validé !",
    verified: true,
    product: 'Tapis de Yoga Antidérapant',
    helpful: 15,
    photos: 2,
    recommend: true,
  },
]

const RATING_DISTRIBUTION = [
  { stars: 5, percent: 78, count: 3219 },
  { stars: 4, percent: 14, count: 578 },
  { stars: 3, percent: 5, count: 206 },
  { stars: 2, percent: 2, count: 82 },
  { stars: 1, percent: 1, count: 42 },
]

const GLOBAL_RATING = 4.8
const TOTAL_REVIEWS = 4127

const KPIS = [
  { icon: Users, value: 4127, label: 'avis clients certifiés', suffix: '+' },
  { icon: ShieldCheck, value: 98, label: 'clients satisfaits', suffix: '%' },
  { icon: Truck, value: 48, label: 'livraison moyenne', suffix: 'h' },
  { icon: Award, value: 96, label: 'recommandent la marque', suffix: '%' },
]

const KEYWORDS = [
  { label: 'Livraison rapide', count: 1842, trend: 'up' },
  { label: 'Bonne qualité', count: 1567, trend: 'up' },
  { label: 'Service client', count: 1203, trend: 'up' },
  { label: 'Bon rapport qualité-prix', count: 987, trend: 'up' },
  { label: 'Emballage soigné', count: 743, trend: 'stable' },
  { label: 'Produit conforme', count: 689, trend: 'up' },
  { label: 'Site sécurisé', count: 521, trend: 'stable' },
  { label: 'Réactivité', count: 412, trend: 'up' },
]

/* ─────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

/* ─────────────────────────────────────────
   COMPONENT : Animated counter (count-up)
───────────────────────────────────────── */
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const count = useMotionValue(0)
  const rounded = useTransform(count, latest => Math.round(latest).toLocaleString('fr-FR'))

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, {
        duration: 1.8,
        ease: [0.22, 1, 0.36, 1],
      })
      return controls.stop
    }
  }, [inView, value, count])

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : Star display
───────────────────────────────────────── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-200 fill-gray-200'
          }
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : KPI card
───────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  value,
  label,
  suffix,
}: {
  icon: typeof Users
  value: number
  label: string
  suffix: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">
        <Counter value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-gray-500 mt-1.5">{label}</p>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : Animated rating bar
───────────────────────────────────────── */
function RatingBar({
  stars,
  percent,
  count,
  isActive,
  onClick,
}: {
  stars: number
  percent: number
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full group flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
        isActive ? 'bg-amber-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-0.5 shrink-0 w-12">
        <span className="text-xs font-medium text-gray-700 tabular-nums">{stars}</span>
        <Star size={11} className="text-amber-400 fill-amber-400" />
      </div>

      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${percent}%` } : { width: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 * (5 - stars) }}
          className={`h-full rounded-full ${
            isActive ? 'bg-amber-500' : 'bg-amber-400 group-hover:bg-amber-500'
          } transition-colors`}
        />
      </div>

      <span className="text-xs text-gray-500 tabular-nums w-14 text-right">
        {count.toLocaleString('fr-FR')}
      </span>
    </button>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : Featured testimonial — CardStack
───────────────────────────────────────── */
function FeaturedTestimonial() {
  const cards = REVIEWS.map(r => ({
    id: r.id,
    name: r.name,
    designation: `${r.location} · ${r.date}`,
    content: (
      <div className="flex flex-col gap-3">
        {/* Stars */}
        <Stars rating={r.rating} size={14} />

        {/* Text */}
        <p className="text-sm text-neutral-700 leading-relaxed">
          {r.product && <Highlight>{r.product}</Highlight>}
          {r.product && ' — '}
          {r.text}
        </p>

        {/* Verified badge */}
        {r.verified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
            ✓ Achat vérifié
          </span>
        )}
      </div>
    ),
  }))

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center justify-center py-4"
    >
      {/* Label */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold uppercase tracking-wider mb-6">
        <Sparkles size={12} />
        Avis du moment
      </div>

      <CardStack items={cards} />
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : Review card (rich)
───────────────────────────────────────── */
function ReviewCard({ review }: { review: Review }) {
  const [helpfulClicked, setHelpfulClicked] = useState(false)
  const [showReply, setShowReply] = useState(false)

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-lg hover:border-gray-200 transition-shadow duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: review.color }}
          >
            {review.avatar}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900">{review.name}</p>
              {review.verified && (
                <span
                  className="inline-flex items-center gap-0.5 text-emerald-600"
                  title="Achat vérifié"
                >
                  <CheckCircle2 size={13} />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              {review.location}
            </p>
          </div>
        </div>

        <span className="text-[11px] text-gray-400 shrink-0">{review.date}</span>
      </div>

      {/* Stars + recommend */}
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} size={14} />
        {review.recommend && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Heart size={10} className="fill-emerald-700" />
            Recommande
          </span>
        )}
      </div>

      {/* Text */}
      <p className="text-sm text-gray-600 leading-relaxed flex-1">{review.text}</p>

      {/* Photos placeholder */}
      {review.photos > 0 && (
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(review.photos, 4) }).map((_, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium"
            >
              {i === 3 && review.photos > 4 ? `+${review.photos - 3}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Product tag */}
      {review.product && (
        <div className="pt-3 border-t border-gray-50">
          <p className="text-[11px] text-gray-400">
            Achat vérifié ·{' '}
            <span className="text-gray-700 font-medium">{review.product}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setHelpfulClicked(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
            helpfulClicked
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        >
          <ThumbsUp size={11} className={helpfulClicked ? 'fill-white' : ''} />
          Utile · {review.helpful + (helpfulClicked ? 1 : 0)}
        </button>

        {review.merchantReply && (
          <button
            onClick={() => setShowReply(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-gray-400 transition-all"
          >
            <MessageCircle size={11} />
            {showReply ? 'Masquer' : 'Réponse du vendeur'}
          </button>
        )}
      </div>

      {/* Merchant reply */}
      <AnimatePresence initial={false}>
        {showReply && review.merchantReply && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 rounded-xl p-4 border-l-2 border-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                  <Sparkles size={10} className="text-amber-400" />
                </div>
                <p className="text-xs font-semibold text-gray-900">
                  {review.merchantReply.name}
                </p>
                <span className="text-[10px] text-gray-400">
                  {review.merchantReply.date}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {review.merchantReply.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

/* ─────────────────────────────────────────
   COMPONENT : Filter chip
───────────────────────────────────────── */
function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
      }`}
    >
      {label}
      <span
        className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
      {active && (
        <motion.div
          layoutId="filter-active"
          className="absolute inset-0 rounded-full bg-gray-900 -z-10"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  )
}

/* ─────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────── */
export function TestimonialsSection() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [sortOpen, setSortOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)

  // Filter + sort
  const filteredReviews = REVIEWS.filter(r =>
    filter === 'all' ? true : r.rating === filter
  ).sort((a, b) => {
    switch (sort) {
      case 'helpful':
        return b.helpful - a.helpful
      case 'rating-high':
        return b.rating - a.rating
      case 'rating-low':
        return a.rating - b.rating
      case 'recent':
      default:
        return a.daysAgo - b.daysAgo
    }
  })

  const sortLabels: Record<SortKey, string> = {
    recent: 'Plus récents',
    helpful: 'Plus utiles',
    'rating-high': 'Mieux notés',
    'rating-low': 'Moins bien notés',
  }

  return (
    <>
    <section className="py-12 sm:py-20 bg-gradient-to-b from-gray-50/60 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ═══ Header ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="text-center mb-8 sm:mb-14"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-semibold uppercase tracking-wider mb-4"
          >
            <Sparkles size={12} className="text-amber-400" />
            Avis vérifiés
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight"
          >
            Ce que pensent
            <br />
            <span className="text-gray-400">nos clients</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-500 text-base mt-4 max-w-lg mx-auto"
          >
            Plus de 4 000 avis certifiés de clients à travers l'Afrique de l'Ouest.
            Chaque retour compte.
          </motion.p>
        </motion.div>

        {/* ═══ KPI Grid ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12"
        >
          {KPIS.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </motion.div>

        {/* ═══ Rating + Featured ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid lg:grid-cols-2 gap-5 mb-8 sm:mb-14"
        >
          {/* Rating block */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Score */}
              <div className="text-center shrink-0">
                <p className="text-6xl font-bold text-gray-900 leading-none tracking-tight">
                  {GLOBAL_RATING}
                </p>
                <div className="mt-3 flex justify-center">
                  <Stars rating={GLOBAL_RATING} size={20} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Basé sur <Counter value={TOTAL_REVIEWS} /> avis
                </p>
              </div>

              <div className="hidden sm:block w-px h-28 bg-gray-100" />

              {/* Distribution */}
              <div className="flex-1 w-full space-y-1">
                {RATING_DISTRIBUTION.map(d => (
                  <RatingBar
                    key={d.stars}
                    {...d}
                    isActive={filter === d.stars}
                    onClick={() => setFilter(filter === d.stars ? 'all' : (d.stars as FilterKey))}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Featured testimonial */}
          <FeaturedTestimonial />
        </motion.div>

        {/* ═══ Keywords cloud ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-14"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-5">
            <h3 className="text-sm font-semibold text-gray-900">
              Ce qui revient dans les avis
            </h3>
            <span className="text-xs text-gray-400">
              · top mots-clés
            </span>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            {KEYWORDS.map((kw, i) => (
              <motion.span
                key={kw.label}
                variants={fadeUp}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-gray-400 cursor-default transition-colors"
                style={{ fontSize: `${12 + Math.min(i, 3) * 0.5}px` }}
              >
                {kw.label}
                <span className="text-gray-400 tabular-nums">
                  {kw.count.toLocaleString('fr-FR')}
                </span>
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* ═══ Filter + Sort bar ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-100"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
            <FilterIcon size={14} className="text-gray-400 shrink-0" />
            <FilterChip
              label="Tous"
              active={filter === 'all'}
              count={TOTAL_REVIEWS}
              onClick={() => setFilter('all')}
            />
            {RATING_DISTRIBUTION.map(d => (
              <FilterChip
                key={d.stars}
                label={`${d.stars} étoiles`}
                active={filter === d.stars}
                count={d.count}
                onClick={() => setFilter(filter === d.stars ? 'all' : (d.stars as FilterKey))}
              />
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-gray-400 transition-colors"
            >
              Trier : <span className="text-gray-900">{sortLabels[sort]}</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 w-48"
                >
                  {(Object.keys(sortLabels) as SortKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        setSort(key)
                        setSortOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                        sort === key
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ═══ Reviews grid ═══ */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          key={`${filter}-${sort}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-16 text-gray-400 text-sm"
              >
                Aucun avis ne correspond à ce filtre.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ CTA ═══ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-10 sm:mt-16 text-center"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex flex-col sm:flex-row items-center gap-4 bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto"
          >
            <div className="flex -space-x-2 pl-4">
              <AnimatedTooltip
                items={[
                  { id: 1, name: 'Amara K.',   designation: 'Abidjan, CI', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&q=80' },
                  { id: 2, name: 'Kofi B.',    designation: 'Dakar, SN',   image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80' },
                  { id: 3, name: 'Fatou D.',   designation: 'Lomé, TG',    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80' },
                  { id: 4, name: 'Samuel N.',  designation: 'Cotonou, BJ', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
                ]}
              />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Vous avez déjà commandé ?
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Partagez votre expérience en quelques secondes
              </p>
            </div>
            <button onClick={() => setCommentOpen(true)} className="group relative dark:bg-neutral-800 bg-neutral-200 rounded-full p-px overflow-hidden">
              <span className="absolute inset-0 rounded-full overflow-hidden">
                <span className="inset-0 absolute pointer-events-none select-none">
                  <span className="block -translate-x-1/2 -translate-y-1/3 size-24 blur-xl" style={{background: 'linear-gradient(135deg, rgba(117, 249, 105, 1), rgba(31, 132, 255, 1), rgb(245, 131, 63))'}} />
                </span>
              </span>
              <span className="inset-0 absolute pointer-events-none select-none" style={{animation: '10s ease-in-out 0s infinite alternate none running border-glow-translate'}}>
                <span className="block z-0 h-full w-12 blur-xl -translate-x-1/2 rounded-full" style={{animation: '10s ease-in-out 0s infinite alternate none running border-glow-scale', background: 'linear-gradient(135deg, rgb(122, 105, 249), rgb(242, 99, 120), rgb(245, 131, 63))'}} />
              </span>
              <span className="flex items-center justify-center gap-1 relative z-[1] dark:bg-neutral-950/90 bg-neutral-50/90 rounded-full py-2 px-4 pl-2 w-full">
                <span className="relative group-hover:scale-105 transition-transform group-hover:rotate-[360deg] duration-500">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80 dark:opacity-100" style={{animation: '14s cubic-bezier(0.68, -0.55, 0.27, 1.55) 0s infinite alternate none running star-rotate'}}>
                    <path d="M11.5268 2.29489C11.5706 2.20635 11.6383 2.13183 11.7223 2.07972C11.8062 2.02761 11.903 2 12.0018 2C12.1006 2 12.1974 2.02761 12.2813 2.07972C12.3653 2.13183 12.433 2.20635 12.4768 2.29489L14.7868 6.97389C14.939 7.28186 15.1636 7.5483 15.4414 7.75035C15.7192 7.95239 16.0419 8.08401 16.3818 8.13389L21.5478 8.88989C21.6457 8.90408 21.7376 8.94537 21.8133 9.00909C21.8889 9.07282 21.9452 9.15644 21.9758 9.2505C22.0064 9.34456 22.0101 9.4453 21.9864 9.54133C21.9627 9.63736 21.9126 9.72485 21.8418 9.79389L18.1058 13.4319C17.8594 13.672 17.6751 13.9684 17.5686 14.2955C17.4622 14.6227 17.4369 14.9708 17.4948 15.3099L18.3768 20.4499C18.3941 20.5477 18.3835 20.6485 18.3463 20.7406C18.3091 20.8327 18.2467 20.9125 18.1663 20.9709C18.086 21.0293 17.9908 21.0639 17.8917 21.0708C17.7926 21.0777 17.6935 21.0566 17.6058 21.0099L12.9878 18.5819C12.6835 18.4221 12.345 18.3386 12.0013 18.3386C11.6576 18.3386 11.3191 18.4221 11.0148 18.5819L6.3978 21.0099C6.31013 21.0563 6.2112 21.0772 6.11225 21.0701C6.0133 21.0631 5.91832 21.0285 5.83809 20.9701C5.75787 20.9118 5.69563 20.8321 5.65846 20.7401C5.62128 20.6482 5.61066 20.5476 5.6278 20.4499L6.5088 15.3109C6.567 14.9716 6.54178 14.6233 6.43534 14.2959C6.32889 13.9686 6.14441 13.672 5.8978 13.4319L2.1618 9.79489C2.09039 9.72593 2.03979 9.63829 2.01576 9.54197C1.99173 9.44565 1.99524 9.34451 2.02588 9.25008C2.05652 9.15566 2.11307 9.07174 2.18908 9.00788C2.26509 8.94402 2.3575 8.90279 2.4558 8.88889L7.6208 8.13389C7.96106 8.08439 8.28419 7.95295 8.56238 7.75088C8.84058 7.54881 9.0655 7.28216 9.2178 6.97389L11.5268 2.29489Z" fill="url(#paint0_linear_171_8212)" stroke="url(#paint1_linear_171_8212)" strokeLinecap="round" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="paint0_linear_171_8212" x1="-0.5" y1={9} x2="15.5" y2="-1.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff9900ff" />
                        <stop offset="0.575" stopColor="#ffe600ff" />
                        <stop offset={1} stopColor="#F5833F" />
                      </linearGradient>
                      <linearGradient id="paint1_linear_171_8212" x1="-0.5" y1={9} x2="15.5" y2="-1.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff8e15ff" />
                        <stop offset="0.575" stopColor="#F26378" />
                        <stop offset={1} stopColor="#f79809ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="rounded-full size-11 absolute opacity-0 dark:opacity-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-lg" style={{animation: '14s ease-in-out 0s infinite alternate none running star-shine', background: 'linear-gradient(135deg, rgb(59, 196, 242), rgb(122, 105, 249), rgba(64, 0, 255, 1), rgba(38, 0, 255, 1))'}} />
                </span>
                <span className="bg-gradient-to-b ml-1.5 dark:from-white dark:to-white/50 from-neutral-950 to-neutral-950/50 bg-clip-text text-xs text-transparent group-hover:scale-105 transition transform-gpu">

                        <FlipText text="Laisser un commentaire" />
                </span>
              </span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>

      {/* Modal commentaire */}
      <AnimatePresence>
        {commentOpen && <CommentModal onClose={() => setCommentOpen(false)} />}
      </AnimatePresence>
    </>
  )
}