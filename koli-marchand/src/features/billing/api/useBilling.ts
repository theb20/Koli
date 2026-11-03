import { useQuery } from '@tanstack/react-query'
import { getBilling, getSubscriptionPlans, getWalletBalance, getWalletTransactions } from '@/lib/merchantgo'

export function useBilling() {
  return useQuery({
    queryKey: ['billing'],
    queryFn: getBilling,
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
