import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { Order, OrderStatus, Paginated } from '@/types'

export interface OrderFilters {
  status: OrderStatus | 'all'
  search: string
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const res = await api.get('/api/seller/orders', {
        params: { status: filters.status, search: filters.search || undefined, pageSize: 100 },
      })
      return unwrap<Paginated<Order>>(res)
    },
    staleTime: 15_000,
  })
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: async () => unwrap<Order>(await api.get(`/api/seller/orders/${id}`)),
    enabled: !!id,
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) =>
      unwrap<Order>(await api.patch(`/api/seller/orders/${id}/status`, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
