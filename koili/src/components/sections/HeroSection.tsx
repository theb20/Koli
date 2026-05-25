import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

export function HeroSection() {
  return (
    <section className="relative bg-[#f5f5f5] overflow-hidden" style={{ height: '480px' }}>
      <span
        className="absolute select-none pointer-events-none font-black text-gray-200 leading-none tracking-tight whitespace-nowrap"
        style={{
          fontSize: 'clamp(100px, 16vw, 190px)',
          right: '2%',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.6,
        }}
      >
        HEADPHONE
      </span>

      <div className="max-w-7xl mx-auto px-6 h-full flex items-center relative z-10">
        <div className="flex-1 space-y-4">
          <p className="text-gray-400 text-sm font-medium tracking-wide">Beats Solo</p>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">Wireless</h1>
          <div className="pt-6">
            <Link to="/shop">
              <Button size="lg" variant="primary">Shop By Category</Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <span
            className="select-none drop-shadow-2xl"
            style={{ fontSize: '160px', lineHeight: 1 }}
          >
            🎧
          </span>
        </div>

        <div className="hidden lg:block flex-[0.7] text-right self-end pb-12">
          <p className="font-bold text-gray-700 text-sm mb-2">Description</p>
          <p className="text-gray-400 text-xs leading-relaxed" style={{ maxWidth: '180px', marginLeft: 'auto' }}>
            There are many variations passages of Lorem ipsum available, but the majority have suffered alteration.
          </p>
        </div>
      </div>
    </section>
  )
}
