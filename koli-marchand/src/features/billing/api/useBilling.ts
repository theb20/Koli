import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getBilling, getSubscriptionPlans, getWalletBalance, getWalletTransactions, getSubscriptionInvoices } from '@/lib/merchantgo'

export function useBilling() {
  return useQuery({
    queryKey: ['billing'],
    queryFn: getBilling,
  })
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: () => getSubscriptionInvoices(),
  })
}

type StoreStatus = { suspendedAt: string | null; suspensionReason: string | null } | null

/** Suspension pour facture d'abonnement impayée — automatique, voir merchantgo. */
export function useMyStoreStatus() {
  return useQuery({
    queryKey: ['my-store-status'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { store: StoreStatus } }>('/api/seller/me')
      return data.data.store
    },
    staleTime: 60_000,
  })
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: getSubscriptionPlans,
  })
}

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  })
}

export function useWalletTransactions(page: number) {
  return useQuery({
    queryKey: ['wallet', 'transactions', page],
    queryFn: () => getWalletTransactions(page, 20),
  })
}
