import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PayoutMethod, ShopSettings } from '@/types'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<ShopSettings>('/api/settings')
      return data
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ShopSettings, 'payoutMethods'>>) => {
      const { data } = await api.patch<ShopSettings>('/api/settings', patch)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useAddPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<PayoutMethod, 'id'>) => {
      const { data } = await api.post<PayoutMethod>('/api/settings/payout-methods', input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useDeletePayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/settings/payout-methods/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
