import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { Paginated, Product, ProductInput, ProductStatus } from '@/types'

export interface ProductFilters {
  status: ProductStatus | 'all'
  search: string
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const res = await api.get('/api/seller/products', {
        params: { status: filters.status, search: filters.search || undefined, pageSize: 100 },
      })
      return unwrap<Paginated<Product>>(res)
    },
    staleTime: 15_000,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProductInput) => unwrap<Product>(await api.post('/api/seller/products', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      unwrap<Product>(await api.patch(`/api/seller/products/${id}`, input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/seller/products/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDuplicateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap<Product>(await api.post(`/api/seller/products/${id}/duplicate`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
