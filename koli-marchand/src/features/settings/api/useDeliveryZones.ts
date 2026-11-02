import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DeliveryZone {
  id: number
  name: string
  price: number
  codAllowed: boolean
  isActive: boolean
  position: number
}

export type DeliveryZoneInput = { name: string; price: number; codAllowed: boolean; isActive: boolean }

/**
 * Communes d'Abidjan — DOIT correspondre exactement à "Abidjan – X" tel
 * qu'affiché dans koili/src/constants/villesCI.ts, utilisé par le client au
 * checkout : le tarif d'une zone n'est appliqué que si son `name` correspond
 * mot pour mot à la ville choisie par le client (voir backend/src/lib/delivery.ts).
 * Toute autre ville (hors Abidjan) retombe sur la zone unique ci-dessous.
 */
export const ABIDJAN_COMMUNES = [
  'Abidjan – Abobo', 'Abidjan – Adjamé', 'Abidjan – Attécoubé', 'Abidjan – Cocody',
  'Abidjan – Koumassi', 'Abidjan – Marcory', 'Abidjan – Plateau', 'Abidjan – Port-Bouët',
  'Abidjan – Treichville', 'Abidjan – Yopougon', 'Abidjan – Bingerville', 'Abidjan – Anyama',
  'Abidjan – Songon', 'Abidjan – Grand-Bassam', 'Abidjan – Jacqueville',
] as const

/** Nom réservé pour toute ville hors Abidjan — une seule zone couvre tout "l'intérieur du pays". */
export const UPCOUNTRY_ZONE_NAME = 'Intérieur du pays'

type ZonesResponse = { data: { zones: DeliveryZone[]; upcountryZoneName: string } }

export function useDeliveryZones() {
  return useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async (): Promise<DeliveryZone[]> => {
      const { data } = await api.get<ZonesResponse>('/api/seller/delivery-zones')
      return data.data.zones
    },
  })
}

export function useCreateDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeliveryZoneInput) => {
      const { data } = await api.post<{ data: DeliveryZone }>('/api/seller/delivery-zones', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}

export function useUpdateDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DeliveryZoneInput> & { id: number }) => {
      const { data } = await api.patch<{ data: DeliveryZone }>(`/api/seller/delivery-zones/${id}`, patch)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}

export function useDeleteDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/seller/delivery-zones/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}

export function useReorderDeliveryZones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (order: number[]) => {
      await api.patch('/api/seller/delivery-zones/reorder', { order })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}
