import { AnimatePresence, motion } from 'motion/react'
import { Check, ShoppingCart, Wrench, Zap } from 'lucide-react'
import { fmt, disc, type Product } from './types'
import { VariantSelector } from './VariantSelector'
import { QuantitySelector } from './QuantitySelector'
import { DeliveryCard } from './DeliveryCard'
import { PromiseAccordion } from './PromiseAccordion'
import { PaymentMethods } from './PaymentMethods'
import { useSiteSettings } from '../../hooks/useSiteSettings'

const BADGE_COPY: Record<string, string> = {
  sale: 'Offre de bienvenue',
  hot: 'Outlet',
}

export function BuyBox({
  product, qty, setQty, color, setColor, variantId, setVariantId, withAssistance, setWithAssistance,
  addedCart, onAddCart, onBuyNow,
}: {
  product: Product
  qty: number
  setQty: (q: number) => void
  color: number
  setColor: (i: number) => void
  variantId: number | null
  setVariantId: (id: number) => void
  withAssistance: boolean
  setWithAssistance: (v: boolean) => void
  addedCart: boolean
  onAddCart: () => void
  onBuyNow: () => void
}) {
  const variant = product.variants?.find(v => v.id === variantId)
  const price = variant?.price ?? product.price
  const stock = variant ? variant.stock : product.stock
  const outOfStock = stock !== null && stock === 0
  // Le prix barré/remise ne porte que sur le produit de base — pas de garantie
  // qu'il s'applique telle quelle à chaque variante, donc masqué dès qu'une
  // variante est sélectionnée plutôt que d'afficher un pourcentage trompeur.
  const d = !variant && product.oldPrice ? disc(product.price, product.oldPrice) : 0
  const promoLabel = product.badge ? BADGE_COPY[product.badge] : null
  const settings = useSiteSettings()

  return (
    <div className="flex flex-col">
      {promoLabel && (
        <p className="text-sm font-bold text-deal mb-1.5">{promoLabel}</p>
      )}

      <div className="flex items-end gap-3 mb-1">
        <p className="text-4xl font-extrabold leading-none text-deal">
          {price.toLocaleString('fr-FR')}
          <span className="text-lg font-semibold ml-1">FCFA</span>
        </p>
      </div>
      {!variant && product.oldPrice && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm text-muted line-through">{fmt(product.oldPrice)}</span>
          <span className="text-sm font-semibold text-deal">-{d}% de réduction</span>
        </div>
      )}
      {(variant || !product.oldPrice) && <div className="mb-5" />}

      <div className="h-px bg-border mb-5" />

      {product.colors && product.colors.length > 0 && (
        <VariantSelector
          type="visual"
          name="Couleur"
          colors={product.colors}
          selected={color}
          onSelect={setColor}
        />
      )}

      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          type="text"
          name="Variante"
          selected={variant?.name ?? ''}
          options={product.variants.map(v => ({ label: v.name, available: v.stock > 0 }))}
          onSelect={label => {
            const match = product.variants!.find(v => v.name === label)
            if (match) setVariantId(match.id)
          }}
        />
      )}

      <div className="flex items-center gap-4 mb-5">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Quantité</span>
        <QuantitySelector qty={qty} max={stock ?? 99} onChange={setQty} />
        {stock !== null && stock > 0 && stock <= 10 && (
          <p className="text-xs font-semibold text-deal">Plus que {stock} en stock</p>
        )}
      </div>

      {product.assistancePrice != null && (
        <label className="mb-5 flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-muted transition-colors">
          <input type="checkbox" checked={withAssistance}
            onChange={e => setWithAssistance(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-ink shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Wrench size={14} /> Assistance technique
            </p>
            <p className="text-xs text-muted mt-0.5">Service d'assistance technique pour ce produit</p>
          </div>
          <span className="text-sm font-bold text-ink shrink-0">
            +{product.assistancePrice.toLocaleString('fr-FR')} FCFA
          </span>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={onBuyNow}
          disabled={outOfStock}
          className={`h-12 rounded flex items-center justify-center gap-2 text-[18px] font-bold text-white transition-colors ${
            outOfStock ? 'bg-border cursor-not-allowed' : 'bg-deal hover:brightness-95'
          }`}
        >
          {outOfStock ? 'Me prévenir' : <><Zap size={16} /> Acheter</>}
        </button>

        <motion.button
          onClick={onAddCart}
          disabled={outOfStock}
          whileTap={{ scale: 0.98 }}
          className={`h-12 rounded flex items-center justify-center gap-2 text-[18px] font-bold text-white transition-colors ${
            outOfStock ? 'bg-border cursor-not-allowed' : 'bg-ink hover:brightness-110'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {addedCart ? (
              <motion.span key="check" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Check size={16} strokeWidth={2.5} /> Ajouté !
              </motion.span>
            ) : (
              <motion.span key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <ShoppingCart size={16} /> Ajouter
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="h-px bg-border mb-5" />

      <DeliveryCard sellerName={product.store?.name} />

      <div className="h-px bg-border my-5" />

      <PromiseAccordion />

      <div className="h-px bg-border my-5" />

      <PaymentMethods codEnabled={settings.codEnabled} />
    </div>
  )
}
