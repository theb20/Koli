/* Données de la page Statistiques — endpoints /api/admin/kpis/* (agrégats serveur). */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type Compare = 'previous' | 'year' | 'none'
export type Granularity = 'day' | 'week' | 'month'

export type KpiValues = {
  revenue: number; orders: number; paidOrders: number; avgBasket: number | null; itemsPerOrder: number | null
  deliveryRate: number | null; cancelRate: number | null; returnRate: number | null; avgDeliveryDays: number | null
  onlineShare: number | null; newCustomers: number; repeatRate: number | null
  assistanceRevenue: number; taxCollected: number; discounts: number
}
export type SeriesPoint = {
  date: string; orders: number; paidOrders: number; revenue: number; delivered: number; cancelled: number
  assistance: number; onlineRevenue: number; newCustomers: number
}
export type KpiResponse = {
  range: { from: string; to: string }; compareRange: { from: string; to: string } | null; granularity: Granularity
  current: KpiValues; previous: KpiValues | null; series: SeriesPoint[]; previousSeries: SeriesPoint[] | null
}
export type Breakdowns = {
  categories: { name: string; revenue: number; qty: number }[]
  payments: { method: string; orders: number; amount: number }[]
  cities: { city: string; orders: number; revenue: number }[]
  products: { id: number; name: string; qty: number; revenue: number; orders: number }[]
}
export type TargetKey = 'revenue' | 'orders' | 'newCustomers' | 'avgBasket'
export type TargetsResponse = {
  targets: Partial<Record<TargetKey, number>>; month: string; elapsedDays: number; daysInMonth: number
  actual: Record<TargetKey, number | null>
}

const get = async <T,>(url: string) => (await api.get(url)).data.data as T

export const useKpis = (from: string, to: string, compare: Compare) => useQuery({
  queryKey: ['kpis', from, to, compare],
  queryFn: () => get<KpiResponse>(`/api/admin/kpis?from=${from}&to=${to}&compare=${compare}`),
  placeholderData: keepPreviousData,
})

export const useBreakdowns = (from: string, to: string) => useQuery({
  queryKey: ['kpis-breakdowns', from, to],
  queryFn: () => get<Breakdowns>(`/api/admin/kpis/breakdowns?from=${from}&to=${to}`),
  placeholderData: keepPreviousData,
})

export const useTargets = () => useQuery({ queryKey: ['kpi-targets'], queryFn: () => get<TargetsResponse>('/api/admin/kpis/targets') })

export function useSaveTargets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (t: Partial<Record<TargetKey, number | null>>) => api.put('/api/admin/kpis/targets', t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-targets'] }),
  })
}
