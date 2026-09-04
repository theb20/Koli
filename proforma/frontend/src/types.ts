export type Currency = 'XOF' | 'EUR' | 'USD' | 'GBP'

export type ProformaStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED' | 'CONVERTED'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED'
export type TemplateName = 'classic' | 'modern' | 'minimal' | 'corporate' | 'elegant'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export type Role = 'ADMIN' | 'COMMERCIAL' | 'COMPTABLE'

export interface Company {
  id: string
  userId: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  taxId?: string | null
  rccm?: string | null
  legalInfo?: string | null
  logoUrl?: string | null
  createdAt: string
  myRole?: Role
}

export interface Member {
  id: string
  userId: string
  companyId: string
  role: Role
  createdAt: string
  user: { id: string; email: string; firstName: string; lastName: string }
}

export interface DocumentSettings {
  id: string
  companyId: string
  proformaPrefix: string
  proformaNumberFmt: string
  proformaCounter: number
  invoicePrefix: string
  invoiceNumberFmt: string
  invoiceCounter: number
  defaultCurrency: Currency
  defaultTemplate: TemplateName
  primaryColor: string
  secondaryColor: string
  defaultNotes?: string | null
  defaultTerms?: string | null
  defaultFooter?: string | null
  emailSenderName?: string | null
  emailSignature?: string | null
}

export interface Client {
  id: string
  companyId: string
  name: string
  contactName?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  country?: string | null
  taxId?: string | null
  rccm?: string | null
  notes?: string | null
  tags?: string[]
  createdAt: string
  _count?: { proformas: number; invoices: number }
}

export interface ClientStats {
  acceptanceRate: number | null
  respondedCount: number
  totalRevenue: number
  currency: Currency
  avgPaymentDelayDays: number | null
  paidInvoicesCount: number
}

export interface Tax {
  id: string
  companyId: string
  name: string
  rate: number
  isDefault: boolean
}

export interface PaymentTerm {
  id: string
  companyId: string
  label: string
  description?: string | null
}

export interface Product {
  id: string
  companyId: string
  reference?: string | null
  name: string
  description?: string | null
  category?: string | null
  unitPrice: number // centimes
  unit: string
  defaultTaxId?: string | null
  defaultTax?: Tax | null
  trackStock: boolean
  stockQuantity: number
  lowStockThreshold: number
}

export interface ProformaItem {
  id?: string
  productId?: string | null
  reference?: string | null
  name: string
  description?: string | null
  quantity: number
  unit: string
  unitPrice: number // centimes
  discountPercent: number
  discountAmount?: number
  taxId?: string | null
  taxRate: number
  lineTotal?: number
}

export interface Customization {
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  borderColor?: string
  fontFamily?: string
  logoSize?: 'small' | 'medium' | 'large'
}

export interface Proforma {
  id: string
  companyId: string
  clientId: string
  client?: Client
  number: string
  reference?: string | null
  object?: string | null
  salesperson?: string | null
  issueDate: string
  expiryDate?: string | null
  paymentTermId?: string | null
  paymentTerm?: PaymentTerm | null
  deliveryDelay?: string | null
  currency: Currency
  status: ProformaStatus
  template: TemplateName
  customization?: Customization | null
  subtotal: number
  discountType: 'percent' | 'amount'
  discountValue: number
  discountAmount: number
  taxAmount: number
  shippingFee: number
  otherFees: number
  otherFeesLabel?: string | null
  deposit: number
  total: number
  balanceDue: number
  notes?: string | null
  termsText?: string | null
  footerText?: string | null
  signatureUrl?: string | null
  stampUrl?: string | null
  publicToken: string
  sentAt?: string | null
  viewedAt?: string | null
  respondedAt?: string | null
  convertedInvoiceId?: string | null
  acceptedByName?: string | null
  paymentStatus?: string | null
  paymentProvider?: string | null
  depositPaidAt?: string | null
  paidAt?: string | null
  items: ProformaItem[]
  activity?: ActivityEntry[]
  createdAt: string
  updatedAt: string
}

export interface Invoice extends Omit<Proforma, 'expiryDate' | 'status' | 'publicToken' | 'convertedInvoiceId'> {
  dueDate?: string | null
  status: InvoiceStatus
  paidAt?: string | null
}

export interface ActivityEntry {
  id: string
  action: string
  actor: string
  createdAt: string
}

export interface Notification {
  id: string
  companyId?: string | null
  type: string
  message: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export interface RecurringPlan {
  id: string
  companyId: string
  clientId: string
  client?: { name: string }
  label: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  nextRunAt: string
  active: boolean
  currency: Currency
  content: TemplateContent
  _count?: { generatedProformas: number }
}

export interface ProformaTemplate {
  id: string
  companyId: string
  clientId?: string | null
  client?: { name: string } | null
  name: string
  content: TemplateContent
}

export interface TemplateContentItem {
  productId?: string | null
  reference?: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxId?: string | null
  taxRate: number
}

export interface TemplateContent {
  items: TemplateContentItem[]
  discountType: 'percent' | 'amount'
  discountValue: number
  shippingFee: number
  otherFees: number
  otherFeesLabel?: string
  deposit: number
  template: TemplateName
  customization?: Customization | null
  notes?: string
  termsText?: string
  footerText?: string
  paymentTermId?: string | null
  expiryDays?: number
  deliveryDelay?: string
  object?: string
  salesperson?: string
}

export interface DashboardStats {
  totalCount: number
  totalAmount: number
  draft: number
  sent: number
  accepted: number
  refused: number
  expired: number
  converted: number
}
