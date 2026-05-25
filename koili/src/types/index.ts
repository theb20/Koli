export interface NavItem {
  label: string
  href: string
}

export interface CategoryCard {
  id: string
  label: string
  title: string
  bigText: string
  bg: string
  textLight: boolean
  colSpan: 1 | 2
  emoji: string
  buttonVariant: 'primary' | 'outline' | 'ghost' | 'deal'
}

export interface Feature {
  id: string
  iconName: string
  title: string
  subtitle: string
}

export interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  description: string
  badge?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Department {
  id: string
  label: string
  icon: string
  hasChildren: boolean
}

export interface HeroSlide {
  id: string
  badge: string
  image?: string
  title: string
  subtitle: string
  buttonText: string
  emoji: string
  bg: string
}

export interface Deal {
  id: string
  discount: number
  featured?: boolean
  brand: string
  name: string
  rating: number
  reviews: number
  price: number
  originalPrice: number
  vendor: string
  sold: number
  total: number
  emoji: string
}

export interface PromoBanner {
  id: string
  label: string
  title: string
  buttonText: string
  bg: string
  textColor: string
  emoji: string
  badge?: string
}

export interface PopularCategory {
  id: string
  name: string
  emoji: string
}

export interface FeaturedDeal {
  id: string
  name: string
  priceMin: number
  priceMax: number
  rating: number
  reviews: number
  sizes: string[]
  emoji: string
  thumbnails: string[]
  discount: number
}

export interface BestSeller {
  id: string
  name: string
  rating: number
  price: number
  originalPrice?: number
  emoji: string
}

export interface TopCategory {
  id: string
  name: string
  emoji: string
}

export interface PopularProduct {
  id: string
  name: string
  price: number
  originalPrice?: number
  discount?: number
  category: string
  emoji: string
}

export interface PromoPair {
  id: string
  badge?: string
  discountLabel?: string
  title: string
  subtitle: string
  priceLabel: string
  price: string
  bg: string
  dark: boolean
  emoji: string
}
