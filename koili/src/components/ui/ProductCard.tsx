import { Heart, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StarRating } from './StarRating'
import type { Deal } from '../../types'

interface ProductCardProps {
  deal: Deal
}

export function ProductCard({ deal }: ProductCardProps) {
  const soldPct = Math.min(100, (deal.sold / deal.total) * 100)

  return (
    <div className="relative bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all duration-200 group cursor-pointer">
      {/* Top badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
        <span className="bg-[#D97706] text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
          -{deal.discount}%
        </span>
        {deal.featured && (
          <span className="bg-[#4F46E5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
            FEATURED
          </span>
        )}
      </div>

      {/* Quick-action icons */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-indigo-50 hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors text-slate-500">
          <Heart size={11} />
        </button>
        <button className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-indigo-50 hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors text-slate-500">
          <Eye size={11} />
        </button>
      </div>

      {/* Product image */}
      <Link to={`/shop/product/${deal.id}`}>
        <div className="flex items-center justify-center h-44 mb-3 overflow-hidden bg-slate-50 rounded-lg">
          <span
            className="select-none group-hover:scale-110 transition-transform duration-300"
            style={{ fontSize: '72px', lineHeight: 1 }}
          >
            {deal.emoji}
          </span>
        </div>
      </Link>

      {/* Info */}
      <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{deal.brand}</p>
      <Link to={`/shop/product/${deal.id}`}>
        <h3 className="text-slate-800 text-sm font-medium mt-0.5 line-clamp-2 hover:text-[#4F46E5] transition-colors" style={{ minHeight: '40px' }}>
          {deal.name}
        </h3>
      </Link>

      <StarRating rating={deal.rating} reviews={deal.reviews} />

      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[#4F46E5] font-bold">${deal.price.toFixed(2)}</span>
        <span className="text-slate-400 line-through text-xs">${deal.originalPrice.toFixed(2)}</span>
      </div>

      <p className="text-[11px] text-slate-400 mt-1">
        By <span className="text-slate-600 font-medium">{deal.vendor}</span>
      </p>

      {/* Progress bar */}
      <div className="mt-2.5">
        <div className="w-full bg-slate-100 rounded-full" style={{ height: '4px' }}>
          <div
            className="bg-[#4F46E5] rounded-full h-full transition-all"
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{deal.sold} sold of {deal.total}</p>
      </div>
    </div>
  )
}
