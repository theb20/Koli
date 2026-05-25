import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function FullWidthBanner() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-4 pb-10">
      <div
        className="relative overflow-hidden rounded-2xl flex items-center justify-between px-10"
        style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          height: '120px',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        {/* Decorative emojis */}
        <span className="absolute right-52 top-1/2 -translate-y-1/2 select-none pointer-events-none text-6xl opacity-20">
          👗
        </span>
        <span className="absolute right-40 bottom-0 select-none pointer-events-none text-5xl opacity-15">
          👔
        </span>

        {/* Text */}
        <div className="relative z-10">
          <p className="text-indigo-200 text-xs font-medium tracking-wide uppercase mb-1">Special Offer</p>
          <h3 className="text-white text-[clamp(14px,2vw,22px)] font-black leading-tight">
            FASHION SALE — UP TO 70% OFF
          </h3>
        </div>

        {/* CTA */}
        <Link to="/shop" className="relative z-10 shrink-0">
          <button className="flex items-center gap-2 bg-white text-[#4F46E5] font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition-colors cursor-pointer shadow-md">
            Shop now
            <ArrowRight size={15} />
          </button>
        </Link>
      </div>
    </section>
  )
}
