import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Check, Plus } from 'lucide-react'
import { useCart } from '../../../contexts/CartContext'
import { fmtPrice } from '../../../lib/api'
import type { ChatProduct } from './types'

/**
 * Carte produit affichée directement dans la conversation — ajoute au vrai
 * panier de l'app (CartContext), jamais un panier parallèle. Les données
 * (prix, stock, image) viennent uniquement du backend, jamais devinées ici.
 */
export function ChatProductCard({ product }: { product: ChatProduct }) {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const outOfStock = product.stock !== undefined && product.stock <= 0

  function handleAdd() {
    if (outOfStock) return
    addItem({
      productId: Number(product.id),
      name: product.name,
      brand: product.brand ?? '',
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.image ?? '',
      stock: product.stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="w-full max-w-[280px] bg-white border-2 border-[#201e1d] overflow-hidden">
      <button onClick={() => navigate(`/catalogue/${product.id}`)} className="block w-full">
        <div className="aspect-square bg-[#eae9e9] overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#7d7979] text-xs">Aucune image</div>
          )}
        </div>
      </button>
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-[#201e1d] leading-snug line-clamp-2">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#201e1d]">{fmtPrice(product.price)}</span>
          {product.oldPrice ? (
            <span className="text-[11px] text-[#7d7979] line-through">{fmtPrice(product.oldPrice)}</span>
          ) : null}
        </div>
        {product.rating !== undefined && product.rating > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-[#605d5d]">
            <Star size={11} className="fill-[#ec3013] text-[#ec3013]" />
            {product.rating.toFixed(1)}
          </div>
        )}
        {outOfStock && <p className="text-[11px] text-[#ae1800] font-semibold">Rupture de stock</p>}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => navigate(`/catalogue/${product.id}`)}
            className="flex-1 min-h-[36px] text-[12px] font-semibold border-2 border-[#201e1d] text-[#201e1d] hover:bg-[#201e1d] hover:text-[#f3f2f2] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013]"
          >
            Voir
          </button>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="flex-1 min-h-[36px] text-[12px] font-semibold bg-[#ec3013] text-white hover:bg-[#dd2b0f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013]"
          >
            {added ? <><Check size={13} /> Ajouté</> : <><Plus size={13} /> Ajouter</>}
          </button>
        </div>
      </div>
    </div>
  )
}
