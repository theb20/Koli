import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, Shield } from 'lucide-react'
import { useCart, fmtCart, type CartItem } from '../../contexts/CartContext'

/* ─────────────────────────────────────────
   CART ITEM ROW
───────────────────────────────────────── */
function CartItemRow({ item }: { item: CartItem }) {
  const { removeItem, updateQty } = useCart()
  const d = item.oldPrice
    ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.22 }}
      className="flex gap-3 py-4 border-b border-gray-100 last:border-0"
    >
      {/* Image */}
      <Link to={`/catalogue/${item.productId}`} className="shrink-0">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
          {item.brand}
        </p>
        <Link to={`/catalogue/${item.productId}`}>
          <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
            {item.name}
          </p>
        </Link>
        {item.color && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ background: item.color }} />
            <span className="text-[11px] text-gray-400">Couleur sélectionnée</span>
          </div>
        )}

        {/* Prix + quantité */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-sm font-bold text-gray-900">{fmtCart(item.price)}</span>
            {d > 0 && <span className="text-xs text-red-500 font-semibold ml-1.5">-{d}%</span>}
          </div>

          {/* Qty controls */}
          <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => updateQty(item.productId, item.qty - 1)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-base"
            >
              <Minus size={11} />
            </button>
            <span className="w-7 text-center text-xs font-bold text-gray-800">{item.qty}</span>
            <button
              onClick={() => updateQty(item.productId, item.qty + 1)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Plus size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => removeItem(item.productId)}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   DRAWER
───────────────────────────────────────── */
export function CartDrawer() {
  const { items, isOpen, closeCart, totalItems, totalPrice, clearCart } = useCart()

  const shipping = totalPrice >= 2500000 ? 0 : 150000 // livraison gratuite > 25 000 FCFA
  const total    = totalPrice + shipping

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-white flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={18} className="text-gray-700" />
                <span className="font-bold text-gray-900">Mon Panier</span>
                {totalItems > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Vider
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Free shipping progress */}
            {totalPrice > 0 && totalPrice < 2500000 && (
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-emerald-700 font-medium">
                    Plus que {fmtCart(2500000 - totalPrice)} pour la livraison gratuite
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {Math.round((totalPrice / 2500000) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalPrice / 2500000) * 100, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
            {totalPrice >= 2500000 && (
              <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <Package size={13} /> 🎉 Livraison gratuite débloquée !
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-4 pb-12"
                >
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <ShoppingCart size={32} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-800">Votre panier est vide</p>
                  <p className="text-sm text-gray-400 text-center max-w-xs">
                    Explorez notre catalogue et ajoutez des articles à votre panier.
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Découvrir le catalogue
                  </button>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {items.map(item => (
                    <CartItemRow key={item.productId} item={item} />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                {/* Récap prix */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sous-total ({totalItems} article{totalItems > 1 ? 's' : ''})</span>
                    <span className="font-medium text-gray-800">{fmtCart(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Livraison</span>
                    <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : 'font-medium text-gray-800'}>
                      {shipping === 0 ? 'Gratuite 🎉' : fmtCart(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-100">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{fmtCart(total)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <Link
                  to="/panier"
                  onClick={closeCart}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                  Passer la commande
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/catalogue"
                  onClick={closeCart}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
                >
                  Continuer les achats
                </Link>

                {/* Trust */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
                  <Shield size={11} />
                  Paiement 100% sécurisé
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
