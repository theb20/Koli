import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Zap, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCart } from '../../contexts/CartContext'
import { API_BASE } from '../../lib/api'

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

function pad(n: number) { return String(n).padStart(2, '0') }

function Countdown({ endsAt }: { endsAt: string }) {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const update = () => setDiff(Math.max(0, new Date(endsAt).getTime() - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  return (
    <div className="flex items-center gap-1.5">
      {([[h,'h'],[m,'m'],[s,'s']] as [number, string][]).map(([v,u]) => (
        <div key={u} className="flex items-center gap-0.5">
          <span className="bg-gray-900 text-white text-sm font-mono font-bold px-2 py-1 rounded-lg min-w-[32px] text-center">{pad(v)}</span>
          <span className="text-gray-500 text-xs font-medium">{u}</span>
        </div>
      ))}
    </div>
  )
}

type FlashProduct = {
  id: number; name: string; brand: string; price: number; salePrice: number; saleEndsAt: string
  images: { url: string; thumbnailUrl?: string | null }[]
  stock: number
}

function FlashCard({ product }: { product: FlashProduct }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const disc = Math.round(((product.price - product.salePrice) / product.price) * 100)
  const img = product.images[0]?.thumbnailUrl || product.images[0]?.url || ''

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (product.stock === 0) return
    addItem({ productId: product.id, name: product.name, brand: product.brand, price: product.salePrice, oldPrice: product.price, image: img, stock: product.stock })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <Link to={`/catalogue/${product.id}`} className="group block bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden">
      <div className="relative bg-gray-50 aspect-square">
        <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">-{disc}%</span>
        <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 font-semibold uppercase">{product.brand}</p>
        <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-base font-black text-red-500">{fmt(product.salePrice)}</p>
            <p className="text-xs text-gray-400 line-through">{fmt(product.price)}</p>
          </div>
          <button onClick={handleAdd}
            disabled={product.stock === 0}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              product.stock === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : `active:scale-95 ${added ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`
            }`}>
            <ShoppingCart size={12} />{product.stock === 0 ? 'Épuisé' : added ? 'Ajouté !' : 'Acheter'}
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Countdown endsAt={product.saleEndsAt} />
        </div>
        {product.stock === 0
          ? <p className="text-[11px] text-gray-400 mt-2 font-semibold">✕ Rupture de stock</p>
          : product.stock <= 10 && <p className="text-[11px] text-red-500 mt-2 font-semibold">⚡ Plus que {product.stock} disponibles</p>
        }
      </div>
    </Link>
  )
}

export function FlashSalesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/flash`)
      return res.json()
    },
    staleTime: 30_000,
  })

  const products: FlashProduct[] = data?.data?.products ?? []
  if (!isLoading && products.length === 0) return null

  return (
    <section className="py-10 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Ventes Flash</h2>
              <p className="text-sm text-red-500 font-semibold">Offres à durée limitée ⚡</p>
            </div>
          </div>
          <Link to="/catalogue?badge=sale" className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600">
            Tout voir <ArrowRight size={15} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-red-300" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <FlashCard product={p} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
