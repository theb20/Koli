import type { PromoPair } from '../types'

export const PROMO_PAIRS: PromoPair[] = [
  {
    id: 'pp-sports',
    discountLabel: 'Get up to 20% OFF',
    title: 'SPORTS OUTFITS',
    subtitle: 'Collection',
    priceLabel: 'Starting at',
    price: '$170.00',
    bg: '#f4f4f4',
    dark: false,
    emoji: '🏋️',
  },
  {
    id: 'pp-accessories',
    badge: 'New Arrivals',
    title: 'ACCESSORIES',
    subtitle: 'Collection',
    priceLabel: 'Only From',
    price: '$50.00',
    bg: '#1a1a2e',
    dark: true,
    emoji: '💄',
  },
]
