/* ── Statuts (unions de littéraux) ────────────────────────── */

export type ProductStatus = 'online' | 'draft' | 'out_of_stock'
// Aligné sur les statuts réels de backend/ (Order.status) — pas de
// 'preparing', mais 'confirmed'/'processing'/'refunded' en plus.
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PayoutStatus = 'pending' | 'paid' | 'failed'
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'draft'
export type PromotionType = 'percentage' | 'fixed_amount'
// Moyen de paiement de la commande côté client (backend/ Order.paymentMethod)
export type OrderPaymentMethod = 'online' | 'cash'
// Moyen de versement au marchand — distinct de OrderPaymentMethod, non
// branché sur un vrai backend pour l'instant (cf. Sidebar.tsx)
export type PaymentMethod = 'wave' | 'orange_money' | 'mtn_money' | 'card' | 'cash_on_delivery'
export type CustomerSegment = 'new' | 'regular' | 'vip'

/* ── Produit ──────────────────────────────────────────────── */

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  price: number
  compareAtPrice?: number
  stock: number
  status: ProductStatus
  description: string
  images: string[]
  soldCount: number
  revenue: number
  createdAt: string
  updatedAt: string
}

export type ProductInput = Omit<Product, 'id' | 'sku' | 'soldCount' | 'revenue' | 'createdAt' | 'updatedAt'>

/* ── Client ───────────────────────────────────────────────── */

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  city: string
  country: string
  segment: CustomerSegment
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  createdAt: string
}

/* ── Commande ─────────────────────────────────────────────── */

export interface OrderItem {
  id: string
  productId: string
  productName: string
  thumbnail: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ShippingAddress {
  address: string
  city: string
  country: string
}

export interface Order {
  id: string
  orderNumber: string
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>
  items: OrderItem[]
  itemsCount: number
  totalAmount: number
  paymentMethod: OrderPaymentMethod
  status: OrderStatus
  shippingAddress: ShippingAddress
  createdAt: string
  updatedAt: string
}

/* ── Versement ────────────────────────────────────────────── */

export interface Payout {
  id: string
  reference: string
  date: string
  method: PaymentMethod
  amount: number
  status: PayoutStatus
}

export interface PayoutMethod {
  id: string
  method: PaymentMethod
  label: string
  maskedNumber: string
  isDefault: boolean
}

export interface Balance {
  available: number
  pending: number
  paidThisMonth: number
}

/* ── Promotion ────────────────────────────────────────────── */

export interface Promotion {
  id: string
  code: string
  type: PromotionType
  value: number
  description: string
  status: PromotionStatus
  startDate: string
  endDate: string
  usageCount: number
  usageLimit: number | null
  minPurchase: number | null
}

export type PromotionInput = Omit<Promotion, 'id' | 'usageCount' | 'status'>

/* ── Paramètres boutique ──────────────────────────────────── */

export interface ShopSettings {
  name: string
  description: string
  email: string
  phone: string
  payoutMethods: PayoutMethod[]
}

/* ── Indicateurs (Dashboard) ──────────────────────────────── */

export interface Kpi {
  key: 'revenue' | 'orders' | 'averageBasket' | 'conversionRate'
  label: string
  value: string
  rawValue: number
  change: number
}

export interface RevenuePoint {
  date: string
  label: string
  amount: number
  isToday: boolean
}

export interface BestSellingProduct {
  productId: string
  name: string
  thumbnail: string
  soldCount: number
  revenue: number
}

export interface DashboardData {
  kpis: Kpi[]
  revenueByDay: RevenuePoint[]
  bestSellers: BestSellingProduct[]
  recentOrders: Order[]
}

/* ── Statistiques ─────────────────────────────────────────── */

export interface CategorySales {
  category: string
  revenue: number
  unitsSold: number
}

export interface PeriodSales {
  label: string
  revenue: number
  orders: number
}

/* ── Auth ─────────────────────────────────────────────────── */

export interface MerchantUser {
  id: string
  shopName: string
  ownerName: string
  email: string
  isVerified: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: MerchantUser
}

/* ── Pagination générique ─────────────────────────────────── */

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
