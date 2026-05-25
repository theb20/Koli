import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { POPULAR_CATEGORIES } from '../../constants/popularCategories'

export function PopularCategories() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-gray-900">Most Popular Categories</h2>
        <Link
          to="/shop"
          className="text-sm text-[#E84040] flex items-center gap-0.5 hover:underline font-medium"
        >
          See all categories
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {POPULAR_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            to={`/shop?category=${cat.id}`}
            className="bg-white border border-gray-100 rounded-sm p-3 flex flex-col items-center justify-center gap-2 hover:border-[#E84040] hover:shadow-md transition-all aspect-square group"
          >
            <span
              className="select-none group-hover:scale-110 transition-transform"
              style={{ fontSize: '38px', lineHeight: 1 }}
            >
              {cat.emoji}
            </span>
            <p className="text-xs font-medium text-gray-600 text-center leading-tight group-hover:text-[#E84040] transition-colors">
              {cat.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
