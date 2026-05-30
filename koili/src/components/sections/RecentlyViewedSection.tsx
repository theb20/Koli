import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useHistory } from '../../hooks/useHistory'
import { fetchProducts, mapApiProduct } from '../../lib/api'

const fmt = (n: number) => Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

export function RecentlyViewedSection() {
  const { token } = useAuth()
  const { getLocalIds } = useHistory()
  const localIds = getLocalIds()

  // If logged in, fetch from server; else use local IDs to fetch product details
  const { data, isLoading } = useQuery({
    queryKey: ['recently-viewed', token ? 'server' : localIds.slice(0, 8).join(',')],
    queryFn: async () => {
      if (token) {
        const res = await fetch(`${(import.meta.env.VITE_API_URL ?? 'http://localhost:4000')}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        return json.data?.products ?? []
      }
      // Guest: use localIds to filter from a general products fetch
      if (localIds.length === 0) return []
      const res = await fetchProducts({ limit: 20 })
      const all = (res.data?.products ?? []).map(mapApiProduct)
      return localIds.map(id => all.find(p => p.id === id)).filter(Boolean)
    },
    enabled: localIds.length > 0 || !!token,
    staleTime: 60_000,
  })

  const products = (data ?? []).slice(0, 8)
  if (!isLoading && products.length === 0) return null

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Récemment consultés</h2>
          </div>
          <Link to="/catalogue" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {products.map((p: ReturnType<typeof mapApiProduct>) => (
              <Link key={p.id} to={`/catalogue/${p.id}`} className="group text-center">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.name}</p>
                <p className="text-xs font-bold text-blue-600 mt-1">{fmt(p.price)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
