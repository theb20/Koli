import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import type { MerchantMessage } from '@/types'

export function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => unwrap<{ messages: MerchantMessage[] }>(await api.get('/api/seller/messages')),
    refetchInterval: 15_000,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { body: string; attachmentUrl?: string }) =>
      unwrap<MerchantMessage>(await api.post('/api/seller/messages', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })
}

export async function uploadMessageImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/api/seller/messages/upload-image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrap<{ url: string }>(res).url
}
