import { PageMeta } from '../components/seo/PageMeta'

export function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageMeta
        title="Blog"
        description="Conseils e-commerce, tendances produits, guides dropshipping et actualités Dropship. Restez à la pointe."
        path="/blog"
        image="/wall/og-blog.jpg"
      />
      <h1 className="text-4xl font-black text-gray-900 mb-2">Blog</h1>
      <p className="text-gray-400 text-sm">Latest news and reviews</p>
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        {['Best Wireless Headphones 2026', 'Gaming Console Guide', 'Smart Home Essentials'].map((title, i) => (
          <div key={i} className="border border-gray-100 rounded-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="h-40 bg-gray-50 rounded-sm mb-4 flex items-center justify-center text-4xl">
              {['🎧', '🎮', '🏠'][i]}
            </div>
            <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
            <p className="text-gray-400 text-xs mt-1">May 2026 · 5 min read</p>
          </div>
        ))}
      </div>
    </div>
  )
}
