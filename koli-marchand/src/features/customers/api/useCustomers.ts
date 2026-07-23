import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Customer, CustomerSegment, Order, Paginated } from '@/types'

export interface CustomerFilters {
  segment: CustomerSegment | 'all'
  search: string
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Customer>>('/api/customers', {
        params: { segment: filters.segment, search: filters.search || undefined, pageSize: 100 },
      })
      return data
    },
    staleTime: 15_000,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ customer: Customer; orders: Order[] }>(`/api/customers/${id}`)
      return data
    },
    enabled: !!id,
  })
}
