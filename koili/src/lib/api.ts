/* ═══════════════════════════════════════════════════════════════
   API CLIENT — client HTTP centralisé pour Koli Frontend
   Toutes les requêtes vers le backend passent par ici.
═══════════════════════════════════════════════════════════════ */

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

/* ─── Formatage prix ─────────────────────────────────────────────
   Les prix sont stockés en "centimes FCFA" (× 100).
   fmtPrice(n) → "29 990 FCFA" (aucun chiffre après la virgule).
───────────────────────────────────────────────────────────────── */
export function fmtPrice(n: number): string {
  return Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
}

/* ─── Types partagés ─────────────────────────────────────────── */

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/* ── Produit API ── */
export type ApiProductImage = { id: number; url: string; position: number }
export type ApiProductSpec  = { id: number; label: string; value: string; position: number }

export type ApiProduct = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  oldPrice?: number | null
  rating: number
  reviews: number
  badge?: string | null
  sold: number
  stock: number
  isNew: boolean
  isActive: boolean
  description?: string | null
  colors?: string | null          // JSON string stocké en base
  createdAt: string
  images?: ApiProductImage[]
  specs?: ApiProductSpec[]
  store?: { id: number; name: string } | null
}

/* ── Commande API ── */
export type ApiOrderItem = {
  id: number
  productId: number
  name: string
  brand: string
  price: number
  qty: number
  image: string
  color?: string | null
}

export type ApiOrder = {
  id: string
  orderNumber: string
  userId?: string | null
  clientPrenom: string
  clientNom: string
  clientEmail: string
  clientTelephone: string
  deliveryMethod: string
  shippingAddress: string    // JSON stringifié
  shippingCost: number
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  discount: number
  taxRate: number
  taxAmount: number
  promoCode?: string | null
  promoDiscount: number
  total: number
  status: string
  notes?: string | null
  trackingNumber?: string | null
  estimatedDelivery?: string | null
  createdAt: string
  items: ApiOrderItem[]
}

/* ── Catégorie API ── */
export type ApiCategory = {
  id: number
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  image?: string | null
  tag?: string | null
  position: number
  isActive: boolean
}

/* ── Review API ── */
export type ApiReview = {
  id: string            // CUID côté backend
  productId: number
  userId: string
  rating: number
  title?: string | null
  body?: string | null
  helpful: number
  verified: boolean
  createdAt: string
  user?: { prenom: string; nom: string; avatar?: string | null }
  product?: { name: string }
}

/* ─── Fetch helper ───────────────────────────────────────────── */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  token?: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.message ?? 'Erreur serveur', res.status)
  }

  return data as T
}

/* ─── Helpers de mapping ─────────────────────────────────────── */

/** Convertit un ApiProduct en shape Product utilisé par le frontend */
export function mapApiProduct(p: ApiProduct) {
  // images : tableau [url] minimum 4 (on duplique la 1ère si besoin)
  const imgUrls = (p.images ?? [])
    .sort((a, b) => a.position - b.position)
    .map(i => i.url)
  while (imgUrls.length < 4) imgUrls.push(imgUrls[0] ?? '')

  // colors : JSON string → string[]
  let colors: string[] | undefined
  try {
    if (p.colors) colors = JSON.parse(p.colors)
  } catch { /* ignore */ }

  // specs : tableau d'objets triés par position
  const specs = (p.specs ?? [])
    .sort((a, b) => a.position - b.position)
    .map(s => ({ label: s.label, value: s.value }))

  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    rating: p.rating,
    reviews: p.reviews,
    badge: (p.badge ?? undefined) as 'hot' | 'new' | 'sale' | 'top' | undefined,
    sold: p.sold,
    stock: p.stock,
    isNew: p.isNew,
    description: p.description ?? undefined,
    colors,
    specs,
    images: imgUrls as [string, string, string, string],
  }
}

/* ─── Endpoints ──────────────────────────────────────────────── */

type ProductsQuery = {
  page?: number
  limit?: number
  category?: string
  q?: string
  sort?: string
  minPrice?: number
  maxPrice?: number
  badge?: string
}

export async function fetchCategories() {
  return apiFetch<ApiResponse<ApiCategory[]>>('/api/categories')
}

export async function fetchProducts(params: ProductsQuery = {}, token?: string | null) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v))
  })
  const query = qs.toString() ? `?${qs}` : ''
  return apiFetch<ApiResponse<{ products: ApiProduct[]; pagination: PaginationMeta }>>(
    `/api/products${query}`,
    token,
  )
}

export async function fetchProduct(id: number | string, token?: string | null) {
  return apiFetch<ApiResponse<{ product: ApiProduct; similar: ApiProduct[]; inWishlist: boolean }>>(
    `/api/products/${id}`,
    token,
  )
}

export async function fetchReviews(productId: number | string) {
  return apiFetch<ApiResponse<{ reviews: ApiReview[]; stats: unknown }>>(
    `/api/reviews/product/${productId}`,
  )
}

export async function fetchLatestReviews(limit = 6) {
  return apiFetch<ApiResponse<{ reviews: ApiReview[] }>>(
    `/api/reviews/latest?limit=${limit}`,
    null,
  )
}

export async function fetchPromo(code: string) {
  return apiFetch<ApiResponse<{
    id: number; code: string; type: string; value: number
    minOrder: number; description?: string | null
  }>>(`/api/promo/${encodeURIComponent(code)}`)
}

export async function createOrder(
  body: {
    clientPrenom: string; clientNom: string
    clientEmail: string; clientTelephone: string
    deliveryMethod: 'standard' | 'express'
    shippingAddress: { ville: string; quartier?: string; adresse: string; instructions?: string }
    paymentMethod: 'orange' | 'mtn' | 'wave' | 'cash'
    items: { productId: number; qty: number; color?: string }[]
    promoCode?: string
    notes?: string
  },
  token?: string | null,
) {
  return apiFetch<ApiResponse<{
    orderNumber: string; orderId: string
    total: number; shippingCost: number; promoDiscount: number
  }>>(
    '/api/orders',
    token,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function fetchOrder(id: string, token?: string | null) {
  return apiFetch<ApiResponse<ApiOrder>>(
    `/api/orders/${encodeURIComponent(id)}`,
    token,
  )
}

export async function fetchMyOrders(token: string, page = 1) {
  return apiFetch<ApiResponse<{ orders: ApiOrder[]; pagination: PaginationMeta }>>(
    `/api/orders?page=${page}`,
    token,
  )
}

/* ── Blog ──────────────────────────────────────────────────── */
export type ApiBlogPost = {
  id: number
  slug: string
  title: string
  excerpt: string
  body: string          // corps complet de l'article (HTML ou markdown)
  coverImage: string
  category: string
  tags: string          // JSON string stocké en base
  author: string
  authorImage?: string | null
  readTime: number
  views: number
  likes: number
  publishedAt: string | null
}

export async function fetchBlogPosts(page = 1, limit = 50) {
  return apiFetch<ApiResponse<{ posts: ApiBlogPost[]; pagination: PaginationMeta }>>(
    `/api/blog?page=${page}&limit=${limit}`,
    null,
  )
}

export async function postContact(body: {
  prenom: string; nom: string; email: string
  telephone?: string; sujet: string; message: string
}) {
  return apiFetch<ApiResponse<unknown>>(
    '/api/contact',
    null,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function submitReview(
  body: { productId: number; rating: number; title?: string; body: string },
  token: string,
) {
  return apiFetch<ApiResponse<ApiReview>>(
    '/api/reviews',
    token,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/* ─── TVA ──────────────────────────────────────────────────── */
export type ApiDefaultTax = { id: string; name: string; rate: number }

export async function fetchDefaultTax() {
  return apiFetch<ApiResponse<{ tax: ApiDefaultTax | null }>>(
    '/api/tax/default',
    null,
  )
}

/* ─── Blog détail ──────────────────────────────────────────── */
export async function fetchBlogPost(slug: string) {
  return apiFetch<ApiResponse<{ post: ApiBlogPost; related: Pick<ApiBlogPost, 'id' | 'slug' | 'title' | 'coverImage' | 'readTime' | 'publishedAt'>[] }>>(
    `/api/blog/${slug}`,
    null,
  )
}

export async function toggleWishlist(productId: number, token: string, remove = false) {
  if (remove) {
    return apiFetch<ApiResponse<unknown>>(`/api/wishlist/${productId}`, token, { method: 'DELETE' })
  }
  return apiFetch<ApiResponse<unknown>>(`/api/wishlist/${productId}`, token, { method: 'POST' })
}

export async function fetchWishlist(token: string) {
  return apiFetch<ApiResponse<{ items: { productId: number; product: ApiProduct }[] }>>(
    '/api/wishlist',
    token,
  )
}

/* ─── Fidélité ──────────────────────────────────────────────── */
export async function fetchLoyalty(token: string) {
  return apiFetch<ApiResponse<{ points: number; transactions: unknown[]; pointValue: number }>>(
    '/api/loyalty/me', token,
  )
}

/* ─── Parrainage ────────────────────────────────────────────── */
export async function fetchReferral(token: string) {
  return apiFetch<ApiResponse<{ code: string; referrals: number; bonusPerReferral: number }>>(
    '/api/referral/me', token,
  )
}

/* ─── Listes de cadeaux ─────────────────────────────────────── */
export async function fetchMyGiftLists(token: string) {
  return apiFetch<ApiResponse<{ lists: unknown[] }>>(
    '/api/gift-lists', token,
  )
}

export async function createGiftList(body: { title: string; occasion?: string; date?: string; isPublic?: boolean }, token: string) {
  return apiFetch<ApiResponse<{ list: unknown }>>(
    '/api/gift-lists', token, { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function addToGiftList(listId: string, productId: number, token: string) {
  return apiFetch<ApiResponse<unknown>>(
    `/api/gift-lists/${listId}/items`, token, { method: 'POST', body: JSON.stringify({ productId }) },
  )
}

export async function deleteGiftList(listId: string, token: string) {
  return apiFetch<ApiResponse<unknown>>(
    `/api/gift-lists/${listId}`, token, { method: 'DELETE' },
  )
}
