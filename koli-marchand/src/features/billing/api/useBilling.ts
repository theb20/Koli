import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  chooseBilling, getBilling, getSubscriptionPlans, getWalletBalance, getWalletTransactions,
  type BillingMode,
} from '@/lib/merchantgo'

export function useBilling() {
  return useQuery({
    queryKey: ['billing'],
    queryFn: getBilling,
  })
}

export function useChooseBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { mode: BillingMode; commissionRate?: number; subscriptionPlanId?: string }) => chooseBilling(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
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
