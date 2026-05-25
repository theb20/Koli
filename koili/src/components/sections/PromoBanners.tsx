import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PROMO_BANNERS } from '../../constants/promoBanners'

export function PromoBanners() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PROMO_BANNERS.map((banner) => (
          <div
            key={banner.id}
            className="relative overflow-hidden rounded-sm flex items-center gap-4 px-6"
            style={{ backgroundColor: banner.bg, height: '130px' }}
          >
            {/* Badge */}
            {banner.badge && (
              <span className="absolute top-2.5 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-sm leading-tight z-10">
                {banner.badge}
              </span>
            )}

            {/* Text */}
            <div className="flex-1 relative z-10 min-w-0">
              <p className="text-xs font-medium text-white/70 truncate">{banner.label}</p>
              <h3
                className="text-sm font-black leading-snug mt-0.5"
                style={{ color: banner.textColor }}
              >
                {banner.title}
              </h3>
              <Link to="/shop">
                <button
                  className="mt-2.5 text-[11px] font-bold px-3 py-1 rounded-sm border border-white/50 text-white hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {banner.buttonText}
                  <ChevronRight size={11} />
                </button>
              </Link>
            </div>

            {/* Emoji */}
            <span
              className="select-none shrink-0"
              style={{ fontSize: '60px', lineHeight: 1 }}
            >
              {banner.emoji}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
