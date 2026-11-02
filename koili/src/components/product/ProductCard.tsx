import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Plus, Star } from 'lucide-react'
import { fmt, disc, BADGE_LABEL, BADGE_STYLE, type Product } from './types'

export function ProductCard({ product, onQuickAdd }: {
  product: Product
  onQuickAdd?: (product: Product) => void
}) {
  const [imgIdx, setImgIdx] = useState(0)
  const [added, setAdded] = useState(false)
  const d = product.oldPrice ? disc(product.price, product.oldPrice) : 0

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    onQuickAdd?.(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Link to={`/catalogue/${product.id}`} className="group block w-full">
      <div className="relative overflow-hidden bg-base rounded-lg mb-3" style={{ aspectRatio: '1/1' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={imgIdx}
            src={product.thumbnails[imgIdx]}
            alt={product.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </AnimatePresence>

        <div className="absolute bottom-0 inset-x-0 flex justify-center gap-1 pb-2 pt-6
                        bg-gradient-to-t from-black/40 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity">
          {product.thumbnails.map((_, i) => (
            <button key={i}
              onMouseEnter={() => setImgIdx(i)}
              onClick={e => { e.preventDefault(); setImgIdx(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
            />
          ))}
        </div>

        {onQuickAdd && (
          <button
            onClick={handleQuickAdd}
            aria-label="Ajouter rapidement au panier"
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-base shadow-md flex items-center justify-center hover:scale-105 transition-transform"
          >
            <AnimatePresence mode="wait" initial={false}>
              {added
                ? <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={16} className="text-brand" /></motion.span>
                : <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Plus size={16} className="text-ink" /></motion.span>}
            </AnimatePresence>
          </button>
        )}
      </div>

      {product.brand && <p className="text-xs font-bold text-ink">{product.brand}</p>}
      <p className="text-sm text-ink leading-snug line-clamp-2 mb-1 min-h-[2.5em]">{product.name}</p>

      <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
        {product.rating > 0 && (
          <>
            <Star size={11} className="text-rating fill-rating" />
            <span>{product.rating.toFixed(1)}</span>
          </>
        )}
        {product.sold > 0 && <span>· {product.sold.toLocaleString('fr-FR')}+ vendus</span>}
      </div>

      {product.badge && (
        <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] ${BADGE_STYLE[product.badge]}`}>
          {BADGE_LABEL[product.badge]}
        </span>
      )}

      <div className="flex items-baseline gap-2">
        <span className={`text-base font-bold ${product.oldPrice ? 'text-deal' : 'text-ink'}`}>{fmt(product.price)}</span>
      </div>
      {product.oldPrice && (
        <p className="text-xs text-muted">
          <span className="line-through">{fmt(product.oldPrice)}</span>{' '}
          <span className="font-semibold text-deal">-{d}%</span>
        </p>
      )}
    </Link>
  )
}
