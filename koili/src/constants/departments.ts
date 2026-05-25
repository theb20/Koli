import type { Department } from '../types'

export const DEPARTMENTS: Department[] = [
  { id: 'electronics', label: 'Electronic Devices', icon: 'Monitor', hasChildren: true },
  { id: 'accessories', label: 'Electronic Accessories', icon: 'Cpu', hasChildren: true },
  { id: 'tv', label: 'TV & Home Appliances', icon: 'Tv', hasChildren: false },
  { id: 'health', label: 'Health & Beauty', icon: 'Heart', hasChildren: false },
  { id: 'toys', label: 'Babies & Toys', icon: 'Smile', hasChildren: false },
  { id: 'kitchen', label: 'Home & Kitchen', icon: 'Home', hasChildren: true },
  { id: 'fashion', label: 'Fashion & Clothing', icon: 'Shirt', hasChildren: false },
  { id: 'sports', label: 'Sports & Travel', icon: 'Compass', hasChildren: false },
  { id: 'books', label: 'Book & Audible', icon: 'BookOpen', hasChildren: false },
  { id: 'garden', label: 'Garden', icon: 'Leaf', hasChildren: false },
  { id: 'pantry', label: 'Pantry Food & Pet Supplies', icon: 'ShoppingBag', hasChildren: false },
  { id: 'audio', label: 'Home Audio', icon: 'Volume2', hasChildren: false },
]
