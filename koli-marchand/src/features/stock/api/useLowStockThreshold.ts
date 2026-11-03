import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type StoreResponse = { data: { store: { lowStockThreshold: number | null } | null } }

export function useLowStockThreshold() {
  return useQuery({
    queryKey: ['low-stock-threshold'],
    queryFn: async (): Promise<number | null> => {
      const { data } = await api.get<StoreResponse>('/api/seller/me')
      return data.data.store?.lowStockThreshold ?? null
    },
  })
}

export function useUpdateLowStockThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (threshold: number | null) => {
      const { data } = await api.patch<{ data: { threshold: number | null } }>('/api/seller/low-stock-threshold', { threshold })
      return data.data.threshold
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['low-stock-threshold'] }),
  })
}
