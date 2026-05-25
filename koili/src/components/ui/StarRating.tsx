import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  reviews?: number
  max?: number
  size?: number
}

export function StarRating({ rating, reviews, max = 5, size = 12 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}
        />
      ))}
      {reviews !== undefined && (
        <span className="text-[11px] text-gray-400 ml-1">{reviews}</span>
      )}
    </div>
  )
}
