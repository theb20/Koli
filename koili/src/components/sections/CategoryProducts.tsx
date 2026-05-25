import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Heart, ShoppingCart, Eye } from 'lucide-react'
import { POPULAR_PRODUCTS } from '../../constants/popularProducts'
import { StarRating } from '../ui/StarRating'

const TABS = ['Gadget', 'Appliances', 'Refrigerators', 'Others']

const TAB_FILTER: Record<string, string[]> = {
  Gadget: ['headphones', 'laptops', 'smartphones', 'gaming', 'cameras', 'smartwatch'],
  Appliances: ['appliances', 'kitchen', 'washing', 'tv'],
  Refrigerators: ['refrigerator'],
  Others: [],
}

export function CategoryProducts() {
  const [activeTab, setActiveTab] = useState('Gadget')

  const filtered = POPULAR_PRODUCTS.filter((p) => {
    const cats = TAB_FILTER[activeTab]
    if (!cats || cats.length === 0) return false
    return cats.some((c) => p.category?.toLowerCase().includes(c))
  })

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">

      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#3b9c3c] text-white'
                  : 'bg-white text-[#686e7d] hover:text-[#151515] border border-[#e0e0e0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Link to="/shop" className="text-sm text-[#3b9c3c] font-semibold flex items-center gap-0.5 hover:underline">
          See all <ChevronRight size={15} />
        </Link>
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e0e0e0] py-16 flex flex-col items-center gap-3 text-center">
          <span className="text-6xl">📦</span>
          <h3 className="text-lg font-bold text-[#151515]">No Product Available</h3>
          <p className="text-[#686e7d] text-sm max-w-sm">
            We're sorry, but there are no products matching on {activeTab} criteria at the moment.<br />
            We're restocking shortly.
          </p>
          <Link to="/shop" className="mt-2 text-sm font-semibold text-[#3b9c3c] hover:underline">
            Explore other categories →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className="relative bg-[#f5f5f5] flex items-center justify-center h-44">
                {product.discount && (
                  <span className="absolute top-2.5 left-2.5 bg-[#fb6c08] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                    -{product.discount}%
                  </span>
                )}
                <span className="select-none group-hover:scale-110 transition-transform duration-300 text-6xl">
                  {product.emoji}
                </span>
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {[Heart, Eye, ShoppingCart].map((Icon, i) => (
                    <button key={i} className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-[#686e7d] hover:text-[#3b9c3c] transition-colors cursor-pointer">
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <p className="text-[10px] text-[#686e7d] uppercase font-semibold tracking-wide">{product.category}</p>
                <Link to={`/shop/product/${product.id}`}>
                  <h3 className="text-sm font-semibold text-[#151515] mt-0.5 line-clamp-2 hover:text-[#3b9c3c] transition-colors leading-snug">
                    {product.name}
                  </h3>
                </Link>
                <StarRating rating={3} size={11} />
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-bold text-[#3b9c3c]">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-[#ababab] line-through">${product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
