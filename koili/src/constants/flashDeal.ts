import type { FeaturedDeal, BestSeller } from '../types'

export const FEATURED_DEAL: FeaturedDeal = {
  id: 'deal-jacket',
  name: 'Coat Pool Comfort Jacket',
  priceMin: 160.00,
  priceMax: 200.00,
  rating: 4,
  reviews: 1,
  sizes: ['Extra Large', 'Large', 'Medium', 'Small'],
  emoji: '🧥',
  thumbnails: ['🧥', '🧥', '🧥', '🧥'],
  discount: 20,
}

export const BEST_SELLERS: BestSeller[] = [
  {
    id: 'bs-1',
    name: 'Kitchen Cooker',
    rating: 0,
    price: 150.60,
    emoji: '🍳',
  },
  {
    id: 'bs-2',
    name: 'Professional Pixel Camera',
    rating: 4,
    price: 215.68,
    originalPrice: 230.45,
    emoji: '📷',
  },
  {
    id: 'bs-3',
    name: "Sport Women's Wear",
    rating: 0,
    price: 220.20,
    originalPrice: 232.62,
    emoji: '👟',
  },
]
