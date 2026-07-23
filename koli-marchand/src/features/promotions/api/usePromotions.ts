import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Promotion, PromotionInput } from '@/types'

export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data } = await api.get<Promotion[]>('/api/promotions')
      return data
    },
  })
}

export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PromotionInput) => {
      const { data } = await api.post<Promotion>('/api/promotions', input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })
}

export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PromotionInput> }) => {
      const { data } = await api.patch<Promotion>(`/api/promotions/${id}`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })
}

export function useDeletePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/promotions/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })
}
