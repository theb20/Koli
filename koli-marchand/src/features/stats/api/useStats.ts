import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { CategorySales, PeriodSales } from '@/types'

interface StatsResponse {
  categorySales: CategorySales[]
  periodSales: PeriodSales[]
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => unwrap<StatsResponse>(await api.get('/api/seller/analytics')),
  })
}
