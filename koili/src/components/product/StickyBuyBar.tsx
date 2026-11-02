import { AnimatePresence, motion } from 'motion/react'
import { ShoppingCart, Zap } from 'lucide-react'
import { fmt, type Product } from './types'

export function StickyBuyBar({ product, visible, variantLabel, onAddCart, onBuyNow }: {
  product: Product
  visible: boolean
  variantLabel?: string | null
  onAddCart: () => void
  onBuyNow: () => void
}) {
  const outOfStock = product.stock !== null && product.stock === 0

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-20 flex items-center gap-4">
            <img
              src={product.thumbnails[0]}
              alt={product.name}
              className="hidden sm:block w-16 h-16 rounded object-cover shrink-0"
            />
            <div className="hidden sm:block flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{product.name}</p>
              {variantLabel && <p className="text-xs text-muted">{variantLabel}</p>}
            </div>

            <p className="text-xl font-bold text-ink sm:hidden flex-1">{fmt(product.price)}</p>
            <p className="hidden sm:block text-xl font-bold text-ink shrink-0">{fmt(product.price)}</p>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onAddCart}
                disabled={outOfStock}
                className="h-11 px-4 rounded flex items-center gap-2 text-sm font-bold text-white bg-ink disabled:bg-border disabled:text-muted transition-colors"
              >
                <ShoppingCart size={15} /> <span className="hidden sm:inline">Ajouter</span>
              </button>
              <button
                onClick={onBuyNow}
                disabled={outOfStock}
                className="h-11 px-4 rounded flex items-center gap-2 text-sm font-bold text-white bg-deal disabled:bg-border disabled:text-muted transition-colors"
              >
                <Zap size={15} /> <span className="hidden sm:inline">Acheter</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
