import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { Product } from './types'

export function ProductCarousel({ title, products, onQuickAdd, seeAllTo }: {
  title: string
  products: Product[]
  onQuickAdd?: (product: Product) => void
  seeAllTo?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (products.length === 0) return null

  const scrollBy = (dx: number) => trackRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAllTo && (
            <a href={seeAllTo} className="text-sm font-semibold text-ink underline underline-offset-2 mr-2">
              Voir tout
            </a>
          )}
          {products.length > 6 && (
            <>
              <button onClick={() => scrollBy(-320)} className="hidden sm:flex w-8 h-8 rounded-full border border-border items-center justify-center hover:bg-base">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => scrollBy(320)} className="hidden sm:flex w-8 h-8 rounded-full border border-border items-center justify-center hover:bg-base">
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {products.map(p => (
          <div key={p.id} className="shrink-0 w-[46%] sm:w-[220px] snap-start">
            <ProductCard product={p} onQuickAdd={onQuickAdd} />
          </div>
        ))}
      </div>
    </div>
  )
}
