import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { DashboardData } from '@/types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => unwrap<DashboardData>(await api.get('/api/seller/dashboard')),
    staleTime: 30_000,
  })
}
