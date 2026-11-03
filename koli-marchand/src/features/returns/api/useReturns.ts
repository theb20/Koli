import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { MerchantReturn } from '@/types'

export function useReturns() {
  return useQuery({
    queryKey: ['returns'],
    queryFn: async () => unwrap<{ items: MerchantReturn[] }>(await api.get('/api/seller/returns')),
    staleTime: 15_000,
  })
}

export function useCommentReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, damaged, comment }: { id: string; damaged: boolean; comment?: string }) =>
      unwrap<MerchantReturn>(await api.patch(`/api/seller/returns/${id}/comment`, { damaged, comment })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  })
}
