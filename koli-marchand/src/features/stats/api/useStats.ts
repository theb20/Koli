import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CategorySales, PeriodSales } from '@/types'

interface StatsResponse {
  categorySales: CategorySales[]
  periodSales: PeriodSales[]
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get<StatsResponse>('/api/stats')
      return data
    },
  })
}
