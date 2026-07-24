import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { Customer, CustomerSegment, Order, Paginated } from '@/types'

export interface CustomerFilters {
  segment: CustomerSegment | 'all'
  search: string
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const res = await api.get('/api/seller/customers', {
        params: { segment: filters.segment, search: filters.search || undefined, pageSize: 100 },
      })
      return unwrap<Paginated<Customer>>(res)
    },
    staleTime: 15_000,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => unwrap<{ customer: Customer; orders: Order[] }>(await api.get(`/api/seller/customers/${id}`)),
    enabled: !!id,
  })
}
