import { Star } from 'lucide-react'
import { motion } from 'motion/react'
import type { Review } from './types'

export function ReviewSummary({ reviews, activeFilter, onFilter }: {
  reviews: Review[]
  activeFilter: number | null
  onFilter: (star: number | null) => void
}) {
  if (reviews.length === 0) return null

  const counts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100),
  }))
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length

  return (
    <div className="p-6 rounded-xl border border-border mb-8">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
        <div className="text-center shrink-0">
          <p className="text-[32px] font-extrabold text-ink leading-none">{avg.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={14}
                className={i <= Math.round(avg) ? 'text-rating fill-rating' : 'text-border fill-border'}
              />
            ))}
          </div>
          <p className="text-xs text-muted mt-1">{reviews.length} avis</p>
        </div>

        <div className="flex-1 space-y-2 w-full">
          {counts.map(({ star, count, pct }) => (
            <button
              key={star}
              onClick={() => onFilter(activeFilter === star ? null : star)}
              className={`w-full flex items-center gap-2.5 rounded-md px-1 -mx-1 transition-colors ${
                activeFilter === star ? 'bg-base' : 'hover:bg-base'
              }`}
            >
              <span className="text-xs text-muted w-3 shrink-0">{star}</span>
              <Star size={11} className="text-rating fill-rating shrink-0" />
              <div className="flex-1 h-1.5 rounded-full bg-base overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-rating"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (5 - star) * 0.08 }}
                />
              </div>
              <span className="text-xs text-muted w-5 text-right shrink-0">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
