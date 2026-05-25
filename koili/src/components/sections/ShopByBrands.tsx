import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { BRANDS } from '../../constants/brands'

export function ShopByBrands() {
  return (
    <section className="bg-white py-10">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-center justify-between mb-7">
          <h2 className="text-xl font-black text-[#151515]">Shop By Brands</h2>
          <Link to="/shop" className="text-sm text-[#3b9c3c] font-semibold flex items-center gap-0.5 hover:underline">
            View all <ChevronRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {BRANDS.map((brand) => (
            <Link
              key={brand.id}
              to={`/shop?brand=${brand.slug}`}
              className="flex flex-col items-center justify-center gap-2 p-4 border border-[#e0e0e0] rounded-xl bg-white hover:border-[#3b9c3c] hover:shadow-md transition-all group aspect-square"
            >
              <span className="text-3xl select-none group-hover:scale-110 transition-transform duration-300">
                {brand.emoji}
              </span>
              <span className="text-xs font-semibold text-[#686e7d] group-hover:text-[#3b9c3c] transition-colors text-center">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
