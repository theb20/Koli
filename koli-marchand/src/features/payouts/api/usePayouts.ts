import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Balance, Paginated, Payout } from '@/types'

export function useBalance() {
  return useQuery({
    queryKey: ['payouts', 'balance'],
    queryFn: async () => {
      const { data } = await api.get<Balance>('/api/payouts/balance')
      return data
    },
  })
}

export function usePayoutsHistory() {
  return useQuery({
    queryKey: ['payouts', 'history'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Payout>>('/api/payouts', { params: { pageSize: 50 } })
      return data
    },
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { amount: number; methodId: string }) => {
      const { data } = await api.post<Payout>('/api/payouts/withdraw', input)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
    },
  })
}
