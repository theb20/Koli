import { useState } from 'react'
import { Check, Star, ThumbsUp } from 'lucide-react'
import { API_BASE } from '../../lib/api'
import type { Review } from './types'

export function ReviewItem({ review }: { review: Review }) {
  const [helped, setHelped] = useState(false)
  const [helpCount, setHelpCount] = useState(review.helpful)

  const handleHelpful = async () => {
    if (helped) return
    setHelped(true)
    setHelpCount(c => c + 1)
    try {
      await fetch(`${API_BASE}/api/reviews/${review.id}/helpful`, { method: 'POST' })
    } catch { /* déjà mis à jour localement, pas critique */ }
  }

  return (
    <div className="py-6 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-base flex items-center justify-center text-xs text-muted shrink-0">
          {review.avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
            <span className="text-sm font-semibold text-ink">{review.author}</span>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] text-brand font-medium">
                <Check size={10} strokeWidth={3} /> Achat vérifié
              </span>
            )}
            <span className="text-xs text-muted ml-auto">{review.date}</span>
          </div>

          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={12}
                className={i <= review.rating ? 'text-rating fill-rating' : 'text-border fill-border'}
              />
            ))}
          </div>

          {review.title && <p className="text-sm font-semibold text-ink mb-1">{review.title}</p>}
          <p className="text-sm text-muted leading-relaxed">{review.body}</p>

          <button
            onClick={handleHelpful}
            disabled={helped}
            className={`mt-3 inline-flex items-center gap-1.5 text-xs transition-colors disabled:cursor-default ${
              helped ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <ThumbsUp size={12} strokeWidth={helped ? 0 : 1.5} className={helped ? 'fill-ink' : ''} />
            Utile ({helpCount})
          </button>
        </div>
      </div>
    </div>
  )
}
