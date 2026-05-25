import { Link } from 'react-router-dom'
import { ChevronRight, Heart, Eye, ShoppingCart } from 'lucide-react'
import { POPULAR_PRODUCTS } from '../../constants/popularProducts'
import { StarRating } from '../ui/StarRating'

export function PopularDepartments() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black text-slate-900">Popular Products</h2>
        <Link
          to="/shop"
          className="text-sm text-[#4F46E5] flex items-center gap-0.5 hover:underline font-medium"
        >
          View all <ChevronRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {POPULAR_PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="relative bg-slate-50 flex items-center justify-center" style={{ height: '160px' }}>
              {product.discount && (
                <span className="absolute top-2.5 left-2.5 bg-[#D97706] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                  -{product.discount}%
                </span>
              )}
              <span
                className="select-none group-hover:scale-110 transition-transform duration-300"
                style={{ fontSize: '64px', lineHeight: 1 }}
              >
                {product.emoji}
              </span>

              <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {[Heart, Eye, ShoppingCart].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-[#4F46E5] hover:shadow-md transition-all cursor-pointer"
                  >
                    <Icon size={12} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                {product.category}
              </p>
              <Link to={`/shop/product/${product.id}`}>
                <h3 className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-2 hover:text-[#4F46E5] transition-colors leading-snug">
                  {product.name}
                </h3>
              </Link>
              <StarRating rating={3} size={11} />
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-bold text-[#4F46E5]">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-slate-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
