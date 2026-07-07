import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Gift, ShoppingCart, Check, Loader2, ArrowLeft, Share2 } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { API_BASE } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

type GiftItem = {
  id: number
  productId: number
  isPurchased: boolean
  product: { id: number; name: string; brand: string; price: number; images: { url: string }[] }
}

type GiftList = {
  id: string; title: string; occasion?: string; date?: string
  user: { prenom: string; nom: string; avatar?: string }
  items: GiftItem[]
}

export default function GiftListPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gift-list', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/gift-lists/${slug}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      return json.data.list as GiftList
    },
  })

  const markPurchased = async (item: GiftItem) => {
    await fetch(`${API_BASE}/api/gift-lists/${data?.id}/items/${item.productId}/purchased`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPurchased: !item.isPurchased }),
    })
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  if (isError || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-5xl">🎁</p>
      <p className="text-xl font-bold text-gray-800">Liste introuvable</p>
      <Link to="/" className="text-sm text-blue-600 hover:underline">Retour à l'accueil</Link>
    </div>
  )

  const bought = data.items.filter(i => i.isPurchased).length
  const pct = data.items.length > 0 ? Math.round((bought / data.items.length) * 100) : 0

  return (
    <>
      <PageMeta title={`${data.title} — Koli`} description={`Liste de cadeaux de ${data.user.prenom}`} path={`/liste/${slug}`} />
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-20">
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6">
            <ArrowLeft size={15} /> Accueil
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            {data.user.avatar && <img src={data.user.avatar} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />}
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift size={20} className="text-pink-500" />
              <h1 className="text-2xl font-black text-gray-900">{data.title}</h1>
            </div>
            <p className="text-gray-500 text-sm">Liste de {data.user.prenom} {data.user.nom}</p>
            {data.date && (
              <p className="text-sm text-pink-600 font-semibold mt-1">
                🗓 {new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <div className="mt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{bought}/{data.items.length} cadeaux offerts ({pct}%)</p>
            </div>
          </div>

          {/* Share */}
          <div className="flex justify-end mb-4">
            <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-300 transition-colors">
              <Share2 size={12} /> Copier le lien
            </button>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {data.items.map(item => {
              const img = item.product.images[0]?.url ?? ''
              return (
                <div key={item.id}
                  className={`flex gap-4 p-4 rounded-2xl border transition-all ${item.isPurchased ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
                  <Link to={`/catalogue/${item.product.id}`} className="shrink-0">
                    <img src={img} alt={item.product.name} className="w-20 h-20 object-cover rounded-xl" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-semibold uppercase">{item.product.brand}</p>
                    <Link to={`/catalogue/${item.product.id}`}>
                      <p className={`text-sm font-bold mt-0.5 ${item.isPurchased ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.product.name}
                      </p>
                    </Link>
                    <p className="text-base font-black text-blue-600 mt-1">{fmt(item.product.price)}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end justify-center shrink-0">
                    {!item.isPurchased ? (
                      <button
                        onClick={() => {
                          addItem({ productId: item.product.id, name: item.product.name, brand: item.product.brand, price: item.product.price, image: img })
                          markPurchased(item)
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        <ShoppingCart size={12} /> Offrir
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                        <Check size={13} /> Offert !
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
