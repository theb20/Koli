import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

export function HeroBanner() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between min-h-[340px] relative overflow-hidden">

          {/* Left: text content */}
          <div className="flex-1 max-w-[520px]">
            <span className="inline-block bg-[#fff3e0] text-[#fb6c08] text-xs font-bold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wide">
              Limited time offer
            </span>
            <h1 className="text-[clamp(28px,4vw,52px)] font-black text-[#151515] leading-[1.1] mb-4">
              Grab Upto{' '}
              <span className="text-[#3b9c3c]">50% Off</span>
              {' '}on Selected Headphone
            </h1>
            <p className="text-[#686e7d] text-base mb-8 max-w-md">
              Discover premium audio quality at unbeatable prices. Limited stock available — shop now before it's gone.
            </p>
            <Link to="/shop">
              <button className="inline-flex items-center gap-2.5 bg-[#3b9c3c] hover:bg-[#2d7a2d] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-green-200">
                <ShoppingCart size={18} />
                Buy Now
              </button>
            </Link>
          </div>

          {/* Right: product image */}
          <div className="hidden md:flex flex-1 items-center justify-center relative">
            {/* Background blob */}
            <div
              className="absolute w-72 h-72 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #3b9c3c 0%, transparent 70%)' }}
            />
            <span
              className="select-none relative z-10 drop-shadow-2xl"
              style={{ fontSize: 'clamp(140px, 18vw, 220px)', lineHeight: 1 }}
            >
              🎧
            </span>
          </div>

        </div>
      </div>
    </section>
  )
}
