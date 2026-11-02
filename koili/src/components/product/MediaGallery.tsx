import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, Heart } from 'lucide-react'

export function MediaGallery({ images, name, wished, onToggleWish }: {
  images: readonly string[]
  name: string
  wished: boolean
  onToggleWish: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const count = images.length

  const prev = () => setIdx(i => (i - 1 + count) % count)
  const next = () => setIdx(i => (i + 1) % count)

  return (
    <div className="lg:sticky lg:top-24 self-start">
      <div className="flex gap-3">
        {/* Vertical thumbnail rail — desktop only */}
        <div className="hidden lg:flex flex-col gap-2 w-[60px] shrink-0">
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`relative shrink-0 w-[60px] h-[60px] rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? 'border-ink' : 'border-border hover:border-muted'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          {count > 6 && (
            <div className="flex items-center justify-center text-muted">
              <ChevronDown size={14} />
            </div>
          )}
        </div>

        {/* Main viewer */}
        <div className="flex-1 min-w-0">
          <div
            className="relative overflow-hidden rounded-xl bg-base cursor-zoom-in"
            style={{ aspectRatio: '1/1', maxWidth: 500 }}
            onClick={() => setZoomed(true)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={idx}
                src={images[idx]}
                alt={name}
                fetchPriority="high"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Favorite */}
            <button
              onClick={e => { e.stopPropagation(); onToggleWish() }}
              aria-label={wished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface shadow-md flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Heart size={16} className={wished ? 'fill-red-500 text-red-500' : 'text-muted'} />
            </button>

            {/* Mobile nav arrows */}
            <button onClick={e => { e.stopPropagation(); prev() }}
              className="lg:hidden absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface/90 shadow-md flex items-center justify-center">
              <ChevronLeft size={16} className="text-ink" />
            </button>
            <button onClick={e => { e.stopPropagation(); next() }}
              className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface/90 shadow-md flex items-center justify-center">
              <ChevronRight size={16} className="text-ink" />
            </button>

            {/* Mobile pagination */}
            <div className="lg:hidden absolute bottom-3 inset-x-0 flex justify-center">
              <span className="px-2 py-0.5 rounded-full bg-ink/70 text-white text-[11px]">
                {idx + 1}/{count}
              </span>
            </div>
          </div>

          {/* Mobile thumbnail strip */}
          <div className="lg:hidden grid grid-cols-4 gap-2 mt-3">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                  i === idx ? 'border-ink' : 'border-border'
                }`}
                style={{ aspectRatio: '1/1' }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
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
    </div>
  )
}
