import { ACCESS_TOKEN_KEY } from './api'

// Appelle merchantgo (Go) directement depuis le navigateur avec le JWT du
// marchand — même service, même pattern déjà utilisé par koli-business
// pour la candidature marchand (JWT_SECRET partagé avec backend/, CORS déjà
// configuré côté merchantgo pour cette origine).
export const MERCHANTGO_URL = import.meta.env.VITE_MERCHANTGO_URL ?? 'http://localhost:8080'

export class MerchantgoError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function merchantgoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const res = await fetch(`${MERCHANTGO_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const body = await res.json().catch(() => ({})) as { success?: boolean; message?: string; data?: T }
  if (!res.ok) {
    throw new MerchantgoError(body.message ?? `Erreur merchantgo (${res.status})`, res.status)
  }
  return body.data as T
}

export type BillingMode = 'commission' | 'subscription'

export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  max_products: number
  max_employees: number
  max_orders: number
  storage_limit_mb: number
  commission_rate: number
  price_monthly: number
  price_yearly: number
  features: string // tableau JSON sérialisé côté merchantgo
  is_active: boolean
  position: number
}

export interface MerchantBilling {
  id: string
  user_id: string
  mode: BillingMode
  commission_rate: number
  subscription_plan_id?: string
  subscription_plan?: SubscriptionPlan
  last_changed_at: string
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  type: string
  order_id: string
  order_number: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
  billing_mode: BillingMode
  created_at: string
}

export interface WalletTransactionsPage {
  transactions: WalletTransaction[]
  total: number
  page: number
  limit: number
}

export function getBilling() {
  return merchantgoRequest<MerchantBilling>('/api/v1/merchant/billing')
}

export function chooseBilling(input: { mode: BillingMode; commissionRate?: number; subscriptionPlanId?: string }) {
  return merchantgoRequest<MerchantBilling>('/api/v1/merchant/billing', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function getWalletBalance() {
  return merchantgoRequest<{ balance: number }>('/api/v1/merchant/wallet/balance')
}

export function getWalletTransactions(page = 1, limit = 20) {
  return merchantgoRequest<WalletTransactionsPage>(`/api/v1/merchant/wallet/transactions?page=${page}&limit=${limit}`)
}

export function getSubscriptionPlans() {
  return merchantgoRequest<SubscriptionPlan[]>('/api/v1/subscription-plans')
}
