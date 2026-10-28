import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { Paginated, Product, ProductDeletionRequest, ProductImage, ProductInput, ProductStatus } from '@/types'

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

// Un marchand ne peut jamais supprimer directement un produit — seulement
// demander sa suppression, que l'admin Skignas approuve ou refuse (voir
// routes/admin-product-deletion-requests.ts côté backend).
export function useDeletionRequests() {
  return useQuery({
    queryKey: ['deletion-requests'],
    queryFn: async () => unwrap<ProductDeletionRequest[]>(await api.get('/api/seller/products/deletion-requests')),
    staleTime: 15_000,
  })
}

export function useRequestProductDeletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      unwrap<ProductDeletionRequest>(await api.post(`/api/seller/products/${id}/deletion-request`, { reason })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deletion-requests'] }),
  })
}

export function useCancelDeletionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap<ProductDeletionRequest>(await api.post(`/api/seller/products/deletion-requests/${id}/cancel`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deletion-requests'] }),
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return unwrap<ProductImage>(await api.post('/api/seller/products/upload-image', form))
    },
  })
}

export function useDuplicateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap<Product>(await api.post(`/api/seller/products/${id}/duplicate`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
