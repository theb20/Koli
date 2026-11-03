import { useQuery } from '@tanstack/react-query'
import { getSettlements } from '@/lib/merchantgo'

export function useSettlements(page: number) {
  return useQuery({
    queryKey: ['settlements', page],
    queryFn: () => getSettlements(page, 20),
  })
}
