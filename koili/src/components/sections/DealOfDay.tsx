import { useState } from 'react'
import { ChevronRight, ShoppingCart, Heart, Share2 } from 'lucide-react'
import { FEATURED_DEAL, BEST_SELLERS } from '../../constants/flashDeal'
import { StarRating } from '../ui/StarRating'
import { QuantitySelector } from '../ui/QuantitySelector'

export function DealOfDay() {
  const deal = FEATURED_DEAL
  const [selectedSize, setSelectedSize] = useState(deal.sizes[1])
  const [activeThumbnail, setActiveThumbnail] = useState(0)

  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">

        {/* Left: Deal of the Day */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="font-black text-slate-900 text-base">Deal of the Day</h2>
              <span className="text-xs font-semibold bg-indigo-50 text-[#4F46E5] px-2.5 py-1 rounded-full">Limited time</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex gap-4 p-5">
            {/* Thumbnails */}
            <div className="flex flex-col gap-2 w-16 shrink-0">
              {deal.thumbnails.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setActiveThumbnail(i)}
                  className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center text-2xl transition-colors cursor-pointer ${
                    activeThumbnail === i ? 'border-[#4F46E5] bg-indigo-50' : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl min-h-[220px]">
              <span className="select-none" style={{ fontSize: '120px', lineHeight: 1 }}>
                {deal.thumbnails[activeThumbnail]}
              </span>
            </div>

            {/* Product details */}
            <div className="flex-1 min-w-0">
              <span className="inline-block bg-[#D97706] text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                {deal.discount}% OFF
              </span>

              <h3 className="text-base font-bold text-slate-900 leading-tight">{deal.name}</h3>

              <p className="text-xl font-black text-slate-900 mt-1.5">
                ${deal.priceMin.toFixed(2)} – ${deal.priceMax.toFixed(2)}
              </p>

              <StarRating rating={deal.rating} reviews={deal.reviews} size={13} />

              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1.5 font-medium">Size:</p>
                <div className="flex flex-wrap gap-1.5">
                  {deal.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-2.5 py-1 text-xs border rounded-md cursor-pointer transition-colors ${
                        selectedSize === size
                          ? 'border-[#4F46E5] text-[#4F46E5] bg-indigo-50'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <QuantitySelector />
                <button className="flex-1 flex items-center justify-center gap-2 bg-[#4F46E5] text-white text-xs font-bold py-2.5 px-3 rounded-lg hover:bg-[#3730A3] transition-colors cursor-pointer">
                  <ShoppingCart size={14} />
                  ADD TO CART
                </button>
              </div>

              <button className="w-full mt-2 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-lg hover:border-slate-400 transition-colors cursor-pointer">
                BUY NOW
              </button>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                <button className="text-slate-400 hover:text-[#4F46E5] transition-colors cursor-pointer">
                  <Heart size={16} />
                </button>
                <button className="text-slate-400 hover:text-[#4F46E5] transition-colors cursor-pointer">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Best Sellers */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-black text-slate-900 text-base">Top Best Sellers</h2>
            <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {BEST_SELLERS.map((seller) => (
              <div key={seller.id} className="flex items-center gap-3 group cursor-pointer">
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 text-3xl border border-slate-100 group-hover:border-[#4F46E5] transition-colors">
                  {seller.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-[#4F46E5] transition-colors truncate">
                    {seller.name}
                  </p>
                  <StarRating rating={seller.rating} size={11} />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-[#4F46E5]">
                      ${seller.price.toFixed(2)}
                    </span>
                    {seller.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        ${seller.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
