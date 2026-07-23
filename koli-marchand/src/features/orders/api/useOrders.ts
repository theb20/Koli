import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Order, OrderStatus, Paginated } from '@/types'

export interface OrderFilters {
  status: OrderStatus | 'all'
  search: string
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Order>>('/api/orders', {
        params: { status: filters.status, search: filters.search || undefined, pageSize: 100 },
      })
      return data
    },
    staleTime: 15_000,
  })
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/api/orders/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data } = await api.patch<Order>(`/api/orders/${id}/status`, { status })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
