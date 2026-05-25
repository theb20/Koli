import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, ChevronRight,
  Volume2, VolumeX,
  AlertCircle, Loader2,
  Sparkles, Play,
} from 'lucide-react'
import { useAllYouTubeCategories } from '../../hooks/useAllYouTubeCategories'
import type { YTVideo } from '../../hooks/useYouTubeSearch'

/* ═══════════════════════════════════════════════════════════
   CONSTANTES & TYPES
═══════════════════════════════════════════════════════════ */

const BRAND_ACCENT = '#E85D04'
const AUTOPLAY_MS = 10_000

type Category = { label: string; query: string; hex: string }

const CATEGORIES: Category[] = [
  { label: 'Tout',       query: 'produit tendance viral dropshipping',               hex: '#FFFFFF' },
  { label: 'Action',     query: 'produit viral action gadget maison led cuisine',    hex: '#3B82F6' },
  { label: 'Amazon',     query: 'amazon best seller tiktok made me buy it viral',    hex: '#F97316' },
  { label: 'Lidl',       query: 'lidl produit tendance cuisine bricolage fitness',   hex: '#FACC15' },
  { label: 'Zara',       query: 'zara fashion tendance femme homme accessoire',      hex: '#18181B' },
  { label: 'Cosmétique', query: 'produit cosmetique viral skincare makeup routine',  hex: '#EC4899' },
  { label: 'Maison',     query: 'gadget maison decoration led organisation cuisine', hex: '#F59E0B' },
  { label: 'Sport',      query: 'fitness récupération sport accessoire gym maison',  hex: '#10B981' },
  { label: 'High-Tech',  query: 'gadget tech viral amazon tiktok accessoires',       hex: '#06B6D4' },
  { label: 'Gaming',     query: 'setup gaming rgb accessoire gamer bureau led',      hex: '#7C3AED' },
]

const CAT_HEX: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.label, c.hex])
)

type EnrichedVideo = YTVideo & { category: string }

/* ═══════════════════════════════════════════════════════════
   UTIL — Build YouTube embed URL
═══════════════════════════════════════════════════════════ */

function buildEmbedSrc(id: string, muted: boolean) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: id,
    controls: '0',
    rel: '0',
    modestbranding: '1',
    showinfo: '0',
    iv_load_policy: '3',
    vq: 'hd2160',
    hd: '1',
  })
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/* ═══════════════════════════════════════════════════════════
   SOUS-COMPOSANTS
═══════════════════════════════════════════════════════════ */

/* ── Header éditorial de la section ───────────────────────── */
function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex items-end justify-between mb-5 px-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} style={{ color: BRAND_ACCENT }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            En direct des réseaux
          </p>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
          Produits qui font le buzz
        </h2>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs font-mono text-white/40">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {count} vidéos · MAJ live
      </div>
    </div>
  )
}

/* ── Filtres catégories — pills scrollables ──────────────── */
function CategoryFilter({
  active,
  onChange,
}: {
  active: string
  onChange: (cat: string) => void
}) {
  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-2 overflow-x-auto px-6 pb-2 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isActive = cat.label === active
          return (
            <button
              key={cat.label}
              onClick={() => onChange(cat.label)}
              className={`
                shrink-0 px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-200 border
                ${isActive
                  ? 'text-black border-transparent shadow-lg'
                  : 'text-white/70 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white'}
              `}
              style={isActive ? { background: cat.hex } : {}}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Player principal ─────────────────────────────────────── */
function VideoPlayer({
  video,
  muted,
  onMute,
  onPrev,
  onNext,
  index,
  total,
}: {
  video: EnrichedVideo
  muted: boolean
  onMute: () => void
  onPrev: () => void
  onNext: () => void
  index: number
  total: number
}) {
  const catColor = CAT_HEX[video.category] ?? '#FFFFFF'

  return (
    <div className="relative w-full bg-black overflow-hidden group" style={{ aspectRatio: '16/9' }}>

      {/* ── iFrame (scale pour masquer les bords noirs) ── */}
      <div className="absolute inset-0 scale-[1.12]">
        <iframe
          key={video.id}
          src={buildEmbedSrc(video.id, muted)}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          title={video.title}
        />
      </div>

      {/* ── Gradients atmosphériques ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />

      {/* ── Masques logo YouTube ── */}
      <div
        className="absolute bottom-0 right-0 w-52 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.95) 55%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-40 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(45deg, rgba(0,0,0,0.95) 40%, transparent 100%)' }}
      />

      {/* ── TOP-LEFT : badge catégorie + LIVE ── */}
      <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
        <span
          className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-black backdrop-blur-md flex items-center gap-1.5"
          style={{ background: catColor }}
        >
          <Play size={10} fill="currentColor" />
          {video.category}
        </span>
        <span className="px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Live
        </span>
      </div>

      {/* ── TOP-RIGHT : compteur + mute ── */}
      <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
        <span className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold text-white bg-black/50 backdrop-blur-md tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <button
          onClick={onMute}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* ── CENTRE : flèches navigation (visibles au hover) ── */}
      <button
        onClick={onPrev}
        aria-label="Précédent"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all flex items-center justify-center z-10"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={onNext}
        aria-label="Suivant"
        className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all flex items-center justify-center z-10"
      >
        <ChevronRight size={22} />
      </button>

      {/* ── BOTTOM : titre vidéo ── */}
      <div className="absolute bottom-6 left-6 right-6 z-10 max-w-3xl">
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">
            Tendance · {video.category}
          </p>
          <h3 className="text-white font-bold text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-lg">
            {video.title}
          </h3>
        </motion.div>
      </div>
    </div>
  )
}

/* ── Progress bar autoplay ────────────────────────────────── */
function ProgressBar({ paused, restartKey }: { paused: boolean; restartKey: string }) {
  return (
    <div className="relative h-1 bg-white/5 overflow-hidden">
      <motion.div
        key={restartKey}
        className="absolute top-0 left-0 h-full"
        style={{ background: BRAND_ACCENT }}
        initial={{ width: '0%' }}
        animate={{ width: paused ? '0%' : '100%' }}
        transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
      />
    </div>
  )
}

/* ── Queue : miniatures des vidéos suivantes ──────────────── */
function VideoQueue({
  pool,
  activeIdx,
  onSelect,
}: {
  pool: EnrichedVideo[]
  activeIdx: number
  onSelect: (idx: number) => void
}) {
  if (pool.length < 2) return null

  /* On affiche les 6 vidéos suivantes (en boucle) */
  const upcoming = Array.from({ length: 6 }, (_, i) => {
    const realIdx = (activeIdx + i + 1) % pool.length
    return { video: pool[realIdx], realIdx }
  })

  return (
    <div className="px-6 py-5 bg-gradient-to-b from-black to-gray-950">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          À suivre
        </p>
        <span className="text-[10px] font-mono text-white/30">
          File d'attente · {pool.length}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none">
        {upcoming.map(({ video, realIdx }, i) => (
          <button
            key={`${video.id}-${i}`}
            onClick={() => onSelect(realIdx)}
            className="group/thumb shrink-0 w-44 relative rounded-lg overflow-hidden border border-white/10 hover:border-white/40 transition-colors"
            style={{ aspectRatio: '16/9' }}
          >
            <img
              src={ytThumb(video.id)}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            {/* Numéro ordre */}
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono text-white bg-black/60 backdrop-blur-sm">
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Badge cat */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: CAT_HEX[video.category] ?? '#FFFFFF' }}
            />

            {/* Titre */}
            <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white line-clamp-2 leading-tight">
              {video.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── États : Loading & Error ──────────────────────────────── */
function LoadingState() {
  return (
    <div className="w-full bg-gray-900 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex flex-col items-center gap-3 text-white/40">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest">Chargement…</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full bg-gray-900 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL — PubSection
═══════════════════════════════════════════════════════════ */

export default function PubSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [filterCat, setFilterCat] = useState('Tout')
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { allVideos, loading, error } = useAllYouTubeCategories(
    CATEGORIES.filter(c => c.label !== 'Tout').map(c => ({ ...c, color: c.hex })),
    3,
  )

  /* Pool filtré */
  const pool = useMemo(() => {
    return filterCat === 'Tout'
      ? allVideos
      : allVideos.filter(v => v.category === filterCat)
  }, [allVideos, filterCat])

  const current = pool[activeIdx % Math.max(pool.length, 1)] ?? null

  /* Autoplay */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pool.length < 2 || paused) return
    timerRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % pool.length)
    }, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pool.length, filterCat, paused])

  /* Reset index quand filtre change */
  useEffect(() => { setActiveIdx(0) }, [filterCat])

  const prev = useCallback(() => {
    setActiveIdx(i => (i - 1 + pool.length) % pool.length)
  }, [pool.length])

  const next = useCallback(() => {
    setActiveIdx(i => (i + 1) % pool.length)
  }, [pool.length])

  return (
    <section
      className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden"
      style={{ background: '#0a0a0a' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pt-8 pb-2">
        <SectionHeader count={allVideos.length} />
        <CategoryFilter active={filterCat} onChange={setFilterCat} />
      </div>

      {/* Player */}
      <div className="relative">
        {loading && <LoadingState />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && current && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${filterCat}-${current.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <VideoPlayer
                  video={current}
                  muted={muted}
                  onMute={() => setMuted(m => !m)}
                  onPrev={prev}
                  onNext={next}
                  index={activeIdx}
                  total={pool.length}
                />
              </motion.div>
            </AnimatePresence>

            <ProgressBar
              paused={paused}
              restartKey={`${filterCat}-${activeIdx}-${paused}`}
            />

            <VideoQueue
              pool={pool}
              activeIdx={activeIdx}
              onSelect={setActiveIdx}
            />
          </>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   MARQUEE — Bandeau logos défilant
═══════════════════════════════════════════════════════════ */

type MarqueeItem = { image: string; href: string; label?: string }

const MARQUEE_ITEMS: MarqueeItem[] = [
  { image: '/icons/amazon.png',    href: 'https://amazon.fr',    label: 'Amazon'    },
  { image: '/icons/zara.png',      href: 'https://zara.com',     label: 'Zara'      },
  { image: '/icons/lidl.png',      href: 'https://lidl.fr',      label: 'Lidl'      },
  { image: '/icons/shein.png',     href: 'https://shein.com',    label: 'Shein'     },
  { image: '/icons/ikea.png',      href: 'https://ikea.com/fr',  label: 'Ikea'      },
  { image: '/icons/action.png',    href: 'https://action.com',   label: 'Action'    },
  { image: '/icons/normal.png',    href: 'https://normal.com',   label: 'Normal'    },
  { image: '/icons/primark.png',   href: 'https://primark.com',  label: 'Primark'   },
  { image: '/icons/carrefour.png', href: 'https://carrefour.fr', label: 'Carrefour' },
  { image: '/icons/kiabi.png',     href: 'https://kiabi.com',    label: 'Kiabi'     },
]

/* Keyframes injectées une seule fois */
const MARQUEE_KEYFRAMES = `
@keyframes marquee-ltr {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.stack-marquee-track {
  animation: marquee-ltr var(--marquee-speed, 28s) linear infinite;
  will-change: transform;
}
.stack-marquee-track:hover { animation-play-state: paused; }
`

export function ImageMarquee({
  items = MARQUEE_ITEMS,
  speed = 28,
  variant = 'light',
  height = 80,
  title = 'Disponibles chez',
}: {
  items?: MarqueeItem[]
  speed?: number
  variant?: 'light' | 'dark'
  height?: number
  title?: string
}) {
  const doubled = [...items, ...items]
  const isDark = variant === 'dark'
  const bg = isDark ? '#0a0a0a' : '#FFFFFF'

  return (
    <>
      <style>{MARQUEE_KEYFRAMES}</style>

      <div
        className={`relative w-screen left-1/2 -translate-x-1/2 overflow-hidden ${
          isDark ? 'border-y border-white/5' : 'border-y border-gray-100'
        }`}
        style={{ background: bg }}
      >
        {/* Optionnel : titre éditorial à gauche */}
        {title && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-6 pr-4 hidden md:flex"
            style={{
              background: bg,
              boxShadow: isDark ? '4px 0 16px rgba(0,0,0,0.6)' : '4px 0 16px rgba(255,255,255,0.9)',
            }}
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              {title}
            </p>
          </div>
        )}

        {/* Fondus latéraux */}
        <div
          className="absolute left-0 top-0 h-full w-24 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${bg}, transparent)` }}
        />
        <div
          className="absolute right-0 top-0 h-full w-24 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${bg}, transparent)` }}
        />

        {/* Track */}
        <div
          className="stack-marquee-track flex items-center"
          style={{
            width: 'max-content',
            height,
            ['--marquee-speed' as string]: `${speed}s`,
          }}
        >
          {doubled.map((item, i) => (
            <a
              key={i}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              title={item.label}
              className={`
                flex items-center justify-center mx-10 shrink-0
                transition-all duration-300
                ${isDark
                  ? 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0 brightness-150 hover:brightness-100'
                  : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}
                hover:scale-110
              `}
              style={{ height: height * 0.55 }}
            >
              <img
                src={item.image}
                alt={item.label ?? ''}
                className="h-full w-auto object-contain"
                style={{ maxWidth: 110 }}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </>
  )
}