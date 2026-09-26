import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CounterKey } from '../lib/navigation'

type Counters = Record<CounterKey, number>

/**
 * Compteurs des pastilles (sidebar, topbar). Un seul appel agrégé au
 * backend + les candidatures, servies par merchantgo (indisponible → 0,
 * sans bloquer le reste).
 */
export function useAdminCounters(): Partial<Counters> {
  const { data } = useQuery({
    queryKey: ['admin-counters'],
    queryFn: async () => (await api.get('/api/admin/overview/counters')).data.data as Omit<Counters, 'pendingApplications'>,
    refetchInterval: 30_000,
  })
  const { data: pendingApplications } = useQuery({
    queryKey: ['merchant-applications-pending-count'],
    queryFn: async () => (await api.get('/api/admin/merchant-applications?status=submitted&limit=1')).data.data.total as number,
    refetchInterval: 60_000,
    retry: false,
  })
  return { ...data, pendingApplications }
}
