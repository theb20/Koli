export type Role = 'customer' | 'admin'

export type AdminUser = {
  id: string
  prenom: string
  nom: string
  email: string
  avatar?: string
  role: Role
}

export type Store = {
  id: number
  name: string
  logo?: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  isActive: boolean
  lastImportAt?: string
  createdAt: string
  _count?: { products: number }
}

export type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  oldPrice?: number
  rating: number
  reviews: number
  badge?: string
  sold: number
  stock: number
  isNew: boolean
  isActive: boolean
  description?: string
  colors?: string
  storeId?: number
  store?: { id: number; name: string }
  createdAt: string
  updatedAt: string
  salePrice?: number | null
  saleStartsAt?: string | null
  saleEndsAt?: string | null
  images: { id: number; url: string; position: number }[]
  specs: { id: number; label: string; value: string; position: number }[]
  merchantSyncStatus?: 'success' | 'failed' | 'skipped' | null
  merchantSyncedAt?: string | null
}

export type MerchantSyncItem = {
  id: string
  runId: string
  productId: number
  productName: string
  status: 'success' | 'failed' | 'skipped'
  error?: string | null
  warnings?: string | null
  createdAt: string
}

export type MerchantSyncRun = {
  id: string
  provider: string
  mode: 'full' | 'selected' | 'retry'
  status: 'running' | 'completed' | 'failed'
  actorId?: string | null
  actorEmail?: string | null
  total: number
  succeeded: number
  failedCount: number
  skippedCount: number
  startedAt: string
  finishedAt?: string | null
  items?: MerchantSyncItem[]
}

export type MerchantPreviewItem = {
  productId: number
  name: string
  valid: boolean
  errors: string[]
  warnings: string[]
}

export type DealAnnouncement = {
  id: number
  productIds: number[]
  segment: 'all' | 'buyers' | 'inactive'
  inactiveDays?: number | null
  sendAt: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  recipientCount?: number | null
  error?: string | null
  createdAt: string
  sentAt?: string | null
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type Order = {
  id: string
  orderNumber: string
  userId?: string
  clientPrenom: string
  clientNom: string
  clientEmail: string
  clientTelephone: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
  deliveryMethod: string
  subtotal: number
  shippingCost: number   // matches backend Prisma field
  promoDiscount: number  // matches backend Prisma field
  taxRate: number        // taux TVA appliqué (ex: 18)
  taxAmount: number      // montant TVA
  total: number
  promoCode?: string
  notes?: string
  shippingAddress: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  user?: { prenom: string; nom: string; email: string }
}

export type OrderItem = {
  id: number
  productId: number
  name: string
  price: number
  qty: number
  color?: string
  image?: string   // matches backend Prisma field
}

export type User = {
  id: string
  prenom: string
  nom: string
  email: string
  telephone?: string
  avatar?: string
  role: Role
  isVerified: boolean
  isBanned: boolean
  createdAt: string
  _count?: { orders: number }
}

export type BlogPost = {
  id: number
  slug: string
  title: string
  excerpt: string
  body: string
  coverImage: string
  category: string
  tags: string
  author: string
  authorImage?: string
  readTime: number
  views: number
  likes: number
  isPublished: boolean
  publishedAt?: string
  createdAt: string
}

export type PromoCode = {
  id: number
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  maxUses?: number
  usedCount: number
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export type Review = {
  id: number
  productId: number
  userId?: string
  authorName: string
  rating: number
  comment?: string
  isVerified: boolean
  createdAt: string
  product?: { name: string }
  user?: { prenom: string; nom: string }
}

// Matches actual Prisma schema: ContactMessage
export type ContactMessage = {
  id: string          // cuid
  prenom: string
  nom: string
  email: string
  telephone?: string
  sujet: string
  message: string
  status: 'new' | 'read' | 'replied'
  createdAt: string
}

export type ProductRequestStatus = 'new' | 'processing' | 'quoted' | 'fulfilled' | 'rejected' | 'cancelled'

export type ProductRequest = {
  id: string
  userId?: string | null
  clientPrenom: string
  clientNom: string
  clientEmail: string
  clientTelephone?: string | null
  productName: string
  description: string
  images: string[]
  quantity?: number | null
  budget?: number | null
  deliveryAddress: string
  desiredDate?: string | null
  status: ProductRequestStatus
  adminReply?: string | null
  quotedPrice?: number | null
  repliedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type OrderReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled'
export type OrderReturnReason = 'defective' | 'wrong_item' | 'not_as_described' | 'no_longer_needed' | 'other'

export type OrderReturnItem = {
  id: number
  returnId: string
  orderItemId: number
  quantity: number
  orderItem: { id: number; name: string; brand: string; price: number; qty: number; image: string; color?: string | null }
}

export type OrderReturn = {
  id: string
  orderId: string
  userId: string
  status: OrderReturnStatus
  reason: OrderReturnReason
  customerComment?: string | null
  adminNotes?: string | null
  rejectionReason?: string | null
  photos?: string | null
  refundAmount?: number | null
  refundMethod?: string | null
  requestedAt: string
  approvedAt?: string | null
  rejectedAt?: string | null
  receivedAt?: string | null
  refundedAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
  items: OrderReturnItem[]
  order: { orderNumber: string; clientEmail: string; clientPrenom: string; total: number; status: string }
  user?: { id: string; prenom: string; nom: string; email: string }
}

export type Category = {
  id: number
  slug: string
  name: string
  description?: string
  icon?: string
  image?: string
  tag?: string
  position: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DashboardStats = {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalProducts: number
  revenueToday: number
  ordersToday: number
  pendingOrders: number
  lowStock: number
  recentOrders: Order[]
  topProducts: { name: string; sold: number; revenue: number }[]
  ordersByStatus: { status: string; count: number }[]
  revenueByDay: { date: string; revenue: number; orders: number }[]
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

/* ── Candidatures marchand (merchantgo, relayé par backend/) ────── */
export type MerchantApplicationStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected'

export type MerchantApplication = {
  id: string
  email?: string
  status: MerchantApplicationStatus
  rejectionReason?: string
  submittedAt?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string

  diditStatus?: string
  diditSessionId?: string
  diditEnvironment?: string
  diditUpdatedAt?: string

  photoProfilUrl: string
  dateNaissance: string
  paysResidence: string
  villeResidence: string
  langue: string
  devise: string

  nomBoutique: string
  logoBoutiqueUrl: string
  banniereBoutiqueUrl: string
  descriptionBoutique: string
  categorieActivite: string
  siteWeb: string

  typeEntreprise: 'individuel' | 'auto-entrepreneur' | 'societe'
  numeroLegal: string
  numeroNCC: string
  formeJuridique: string
  nomEntreprise: string
  adresseSiege: string

  paysAdresse: string
  regionAdresse: string
  villeAdresse: string
  codePostal: string
  adresseComplete: string

  titulaireCompte: string
  banque: string
  iban: string
  swift: string
  mobileMoneyOperateur: string
  mobileMoneyNumero: string
  moyenPaiementPrefere: 'mobile_money' | 'virement_bancaire'

  typeDocument: 'cni' | 'passeport' | 'permis'
  documentIdentiteUrl: string
  selfieUrl: string
  justificatifDomicileUrl: string

  zonesLivraison: string
  modesLivraison: string
  delaisLivraison: string
  fraisLivraison: string
  retraitMagasin: boolean

  domainePersonnalise: string
  horairesOuverture: string
  facebook: string
  instagram: string
  whatsapp: string
  politiqueRetour: string
  cgv: boolean
}
