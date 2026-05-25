import { Link } from 'react-router-dom'
import { TOP_CATEGORIES } from '../../constants/topCategories'

export function TopCategoriesMonth() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col items-center mb-7">
        <h2 className="text-xl font-black text-slate-900">Top Categories This Month</h2>
        <div className="w-12 h-0.5 bg-[#4F46E5] rounded-full mt-2" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {TOP_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            to={`/shop?category=${cat.id}`}
            className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md hover:border-[#4F46E5] transition-all group aspect-square"
          >
            <span
              className="select-none group-hover:scale-110 transition-transform duration-300"
              style={{ fontSize: '44px', lineHeight: 1 }}
            >
              {cat.emoji}
            </span>
            <p className="text-xs font-semibold text-slate-700 text-center group-hover:text-[#4F46E5] transition-colors">
              {cat.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
