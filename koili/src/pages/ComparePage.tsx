import { useSearchParams, Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ArrowLeft, Check, X, ShoppingCart, Loader2 } from 'lucide-react'
import { fetchProduct, mapApiProduct } from '../lib/api'
import { useCart } from '../contexts/CartContext'
import { PageMeta } from '../components/seo/PageMeta'

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

export default function ComparePage() {
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').map(Number).filter(Boolean).slice(0, 4)
  const { addItem } = useCart()

  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['product', id],
      queryFn:  () => fetchProduct(id),
    })),
  })

  const products = results
    .filter(r => r.data?.data?.product)
    .map(r => mapApiProduct(r.data!.data!.product))

  const isLoading = results.some(r => r.isLoading)

  // Collect all spec labels across all products
  const specLabels = Array.from(
    new Set(products.flatMap(p => (p.specs ?? []).map(s => s.label)))
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <>
      <PageMeta title="Comparateur de produits" description="Comparez vos produits côte à côte" path="/comparer" />

      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

          <div className="flex items-center gap-3 mb-8">
            <Link to="/catalogue" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Retour
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Comparateur</h1>
          </div>

          {products.length < 2 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-lg font-bold text-gray-700">Sélectionnez au moins 2 produits à comparer</p>
              <Link to="/catalogue" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                Parcourir le catalogue
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <td className="w-40 pr-4" />
                    {products.map(p => (
                      <th key={p.id} className="px-4 pb-6 text-center min-w-[200px]">
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                          <img src={p.thumbnails[0]} alt={p.name} className="w-full h-40 object-contain rounded-xl mb-3" />
                          <p className="text-xs text-gray-400 font-semibold uppercase">{p.brand}</p>
                          <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-2">{p.name}</p>
                          <p className="text-lg font-black text-blue-600 mt-2">{fmt(p.price)}</p>
                          <button
                            onClick={() => p.stock !== 0 && addItem({ productId: p.id, name: p.name, brand: p.brand, price: p.price, image: p.thumbnails[0], stock: p.stock ?? undefined })}
                            disabled={p.stock === 0}
                            className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                              p.stock === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <ShoppingCart size={13} />
                            {p.stock === 0 ? 'Épuisé' : 'Ajouter'}
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Notes */}
                  <tr className="border-t border-gray-100">
                    <td className="py-4 pr-4 text-sm font-semibold text-gray-500 bg-gray-50 rounded-l-xl pl-3">Note</td>
                    {products.map(p => (
                      <td key={p.id} className="py-4 px-4 text-center text-sm font-bold text-amber-500">
                        ⭐ {p.rating.toFixed(1)}
                        <span className="text-gray-400 font-normal"> ({p.reviews})</span>
                      </td>
                    ))}
                  </tr>
                  {/* Prix barré */}
                  <tr className="border-t border-gray-100">
                    <td className="py-4 pr-4 text-sm font-semibold text-gray-500 bg-gray-50 pl-3">Prix initial</td>
                    {products.map(p => (
                      <td key={p.id} className="py-4 px-4 text-center text-sm text-gray-400">
                        {p.oldPrice ? <span className="line-through">{fmt(p.oldPrice)}</span> : '—'}
                      </td>
                    ))}
                  </tr>
                  {/* Stock */}
                  <tr className="border-t border-gray-100">
                    <td className="py-4 pr-4 text-sm font-semibold text-gray-500 bg-gray-50 pl-3">Disponibilité</td>
                    {products.map(p => (
                      <td key={p.id} className="py-4 px-4 text-center">
                        {(p.stock ?? 0) > 0
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold"><Check size={12} /> En stock</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-red-500 font-bold"><X size={12} /> Rupture</span>}
                      </td>
                    ))}
                  </tr>
                  {/* Vendu */}
                  <tr className="border-t border-gray-100">
                    <td className="py-4 pr-4 text-sm font-semibold text-gray-500 bg-gray-50 pl-3">Vendus</td>
                    {products.map(p => (
                      <td key={p.id} className="py-4 px-4 text-center text-sm text-gray-700">{p.sold.toLocaleString('fr-FR')}</td>
                    ))}
                  </tr>
                  {/* Specs dynamiques */}
                  {specLabels.map(label => (
                    <tr key={label} className="border-t border-gray-100">
                      <td className="py-4 pr-4 text-sm font-semibold text-gray-500 bg-gray-50 pl-3">{label}</td>
                      {products.map(p => {
                        const spec = (p.specs ?? []).find(s => s.label === label)
                        return (
                          <td key={p.id} className="py-4 px-4 text-center text-sm text-gray-700">
                            {spec?.value ?? <span className="text-gray-300">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
