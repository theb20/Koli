import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Informations de la boutique (backend/ SellerStore, via /api/seller/me) —
// les moyens de versement (payoutMethods côté mock) restent hors périmètre
// tant que le système de wallet n'est pas conçu, cf. Sidebar.tsx.
export interface ShopInfo {
  name: string
  description: string
  phone: string
}

type StoreResponse = { data: { store: { name: string; description: string | null; phone: string | null } | null } }

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<ShopInfo> => {
      const { data } = await api.get<StoreResponse>('/api/seller/me')
      const store = data.data.store
      return { name: store?.name ?? '', description: store?.description ?? '', phone: store?.phone ?? '' }
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<ShopInfo>) => {
      const { data } = await api.patch<StoreResponse>('/api/seller/me', patch)
      const store = data.data.store
      return { name: store?.name ?? '', description: store?.description ?? '', phone: store?.phone ?? '' } as ShopInfo
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
