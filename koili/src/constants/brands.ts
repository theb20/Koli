export interface Brand {
  id: string
  name: string
  emoji: string
  slug: string
}

export const BRANDS: Brand[] = [
  { id: 'hitech', name: 'Hi-Tech', emoji: '⚡', slug: 'hi-tech' },
  { id: 'hp', name: 'HP', emoji: '🖨️', slug: 'hp' },
  { id: 'apple', name: 'Apple', emoji: '🍎', slug: 'apple' },
  { id: 'a4tech', name: 'A4 Tech', emoji: '🖱️', slug: 'a4-tech' },
  { id: 'hitachi', name: 'Hitachi', emoji: '📺', slug: 'hitachi' },
  { id: 'huawei', name: 'Huawei', emoji: '📱', slug: 'huawei' },
  { id: 'ikea', name: 'IKEA', emoji: '🪑', slug: 'ikea' },
  { id: 'sony', name: 'Sony', emoji: '🎵', slug: 'sony' },
]
