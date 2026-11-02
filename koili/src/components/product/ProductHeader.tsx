import { Link } from 'react-router-dom'
import { Star, Info } from 'lucide-react'
import type { Product } from './types'

export function ProductHeader({ product, onReviewsClick }: {
  product: Product
  onReviewsClick: () => void
}) {
  const showBestSeller = product.badge === 'hot' || product.badge === 'top'

  return (
    <div>
      <Link
        to={`/catalogue?cat=${product.category}`}
        className="text-sm font-bold text-ink uppercase tracking-wide hover:text-brand transition-colors"
      >
        {product.brand}
      </Link>

      <h1 className="mt-2 text-2xl sm:text-[26px] font-bold text-ink leading-snug">
        {product.name}
      </h1>

      {showBestSeller && (
        <div className="mt-2.5 flex items-center gap-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-base text-ink font-semibold text-xs">
            Meilleures ventes
          </span>
          <span className="text-muted text-xs">
            dans{' '}
            <Link to={`/catalogue?cat=${product.category}`} className="underline underline-offset-2 hover:text-ink">
              {product.category}
            </Link>
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2.5 text-sm flex-wrap">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={14}
              className={i <= Math.round(product.rating) ? 'text-rating fill-rating' : 'text-border fill-border'}
            />
          ))}
        </div>
        <span className="text-ink font-medium">{product.rating.toFixed(1)}</span>
        <button
          onClick={onReviewsClick}
          className="underline underline-offset-2 text-muted hover:text-ink transition-colors"
        >
          ({product.reviews.toLocaleString('fr-FR')} avis)
        </button>
        <span title="Note moyenne calculée sur les avis clients vérifiés">
          <Info size={13} className="text-muted" />
        </span>

        {product.sold > 0 && (
          <>
            <span className="w-px h-3.5 bg-border" />
            <span className="text-muted">{product.sold.toLocaleString('fr-FR')}+ vendu(s)</span>
            <span title="Nombre total d'unités vendues sur la plateforme">
              <Info size={13} className="text-muted" />
            </span>
          </>
        )}
      </div>
    </div>
  )
}
