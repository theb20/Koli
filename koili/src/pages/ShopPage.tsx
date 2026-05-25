import { PageMeta } from '../components/seo/PageMeta'

export function ShopPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageMeta
        title="Boutique"
        description="Parcourez des milliers de produits sélectionnés — high-tech, mode, maison et bien plus. Livraison rapide partout en Côte d'Ivoire."
        path="/shop"
        image="/wall/og-shop.jpg"
      />
      <h1 className="text-4xl font-black text-gray-900 mb-2">Shop</h1>
      <p className="text-gray-400 text-sm">Browse all products</p>
      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-sm bg-gray-50 aspect-square flex items-center justify-center text-5xl">
            {['🎧', '💻', '⌚', '🎮', '🥽', '🔊', '📱', '🖥️'][i]}
          </div>
        ))}
      </div>
    </div>
  )
}
