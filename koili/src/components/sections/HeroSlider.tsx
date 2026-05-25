import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

import { HERO_SLIDES } from '../../constants/heroSlides'

const TRENDING = [
  'Sneakers',
  'Casques audio',
  'Montres',
  'Gaming setup',
]

export function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [search, setSearch] = useState('')

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % HERO_SLIDES.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
  }, [])

  useEffect(() => {
    const id = setInterval(next, 7000)
    return () => clearInterval(id)
  }, [next])

  const slide = HERO_SLIDES[current]

  return (
    <section className="bg-white border-b">

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">

        <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* LEFT CONTENT */}
          <div>

            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Nouvelle collection
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black mt-3 leading-tight">
              {slide.title}
            </h1>

            <p className="text-gray-600 mt-5 text-lg max-w-xl">
              {slide.subtitle}
            </p>

            {/* SEARCH BOX (CORE AMAZON STYLE) */}
            <div className="mt-8">

              <div className="flex items-center h-12 border border-gray-300 rounded-full overflow-hidden focus-within:border-black transition">

                <Search className="ml-4 text-gray-500" size={18} />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="flex-1 px-3 outline-none text-sm"
                />

                <button className="bg-black text-white h-full px-5 text-sm font-semibold hover:bg-gray-800">
                  Rechercher
                </button>
              </div>

              {/* TRENDING */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <TrendingUp size={14} />
                  Tendances :
                </div>

                {TRENDING.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSearch(t)}
                    className="text-xs px-3 py-1 rounded-full border border-gray-200 hover:border-black hover:text-black transition"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* CTA */}
              <div className="flex gap-3 mt-6">

                <Link to="/shop">
                  <button className="h-11 px-6 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2">
                    Voir la boutique
                    <ArrowRight size={16} />
                  </button>
                </Link>

                <button className="h-11 px-6 border border-gray-300 rounded-full text-sm font-semibold hover:border-black transition">
                  Offres du jour
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT IMAGE (ACTION STYLE) */}
          <div className="relative">

            <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">

              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* SIMPLE BADGE (ACTION STYLE) */}
            <div className="absolute top-4 left-4 bg-white px-3 py-1 text-xs font-bold rounded-full shadow">
              -30% aujourd’hui
            </div>

            {/* NAV BUTTONS */}
            <div className="absolute bottom-4 right-4 flex gap-2">

              <button
                onClick={prev}
                className="w-10 h-10 bg-white border rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={next}
                className="w-10 h-10 bg-white border rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}