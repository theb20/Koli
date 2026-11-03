import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export interface ProductVariant {
  id: number
  productId: number
  name: string
  price: number
  stock: number
  sku: string | null
  position: number
  isActive: boolean
}

export type VariantInput = { name: string; price: number; stock: number; sku?: string; isActive: boolean }

export function useVariants(productId: string) {
  return useQuery({
    queryKey: ['variants', productId],
    queryFn: async () => unwrap<ProductVariant[]>(await api.get(`/api/seller/products/${productId}/variants`)),
    enabled: !!productId,
  })
}

export function useCreateVariant(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: VariantInput) =>
      unwrap<ProductVariant>(await api.post(`/api/seller/products/${productId}/variants`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateVariant(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<VariantInput> & { id: number }) =>
      unwrap<ProductVariant>(await api.patch(`/api/seller/products/${productId}/variants/${id}`, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/seller/products/${productId}/variants/${id}`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
