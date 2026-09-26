/* Données de la Vue d'ensemble — endpoints /api/admin/overview/* (agrégats serveur). */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type Period = '7d' | '30d' | 'month' | 'lastMonth'
export type Origin = 'all' | 'skignas' | 'merchants'

export type Kpis = { delivered: number; orders: number; avgBasket: number; newCustomers: number }
export type Performance = { period: Period; origin: Origin; from: string; to: string; current: Kpis; previous: Kpis }

export type SalesMonth = { month: string; revenue: number; orders: number }
export type Sales = { months: SalesMonth[]; average: number; current: number; previousSamePeriod: number }

export type AgendaType = 'deal' | 'email' | 'blog' | 'store'
export type AgendaEvent = { id: string; type: AgendaType; title: string; start: string; end: string | null; link: string }

export type Insights = {
  todo: { pendingOrders: number; lateOrders: number; requestedReturns: number; newProductRequests: number; unreadContacts: number; lateDays: number }
  topProducts: { id: number; name: string; image: string | null; qty: number; revenue: number; trend: number[] }[]
  topStores: { id: number; name: string; logo: string | null; orders: number; revenue: number }[]
  payments: { method: string; orders: number; amount: number }[]
  cities: { city: string; orders: number; revenue: number }[]
  lowStock: { id: number; name: string; stock: number; image: string | null; store: string | null; threshold: number }[]
  activity: { id: string; type: 'order' | 'review' | 'store' | 'return'; text: string; amount: number | null; at: string; link: string }[]
}

const get = async <T,>(url: string) => (await api.get(url)).data.data as T

export const usePerformance = (period: Period, origin: Origin) => useQuery({
  queryKey: ['overview', 'performance', period, origin],
  queryFn: () => get<Performance>(`/api/admin/overview/performance?period=${period}&origin=${origin}`),
  placeholderData: keepPreviousData,
})

export const useSales = () => useQuery({ queryKey: ['overview', 'sales'], queryFn: () => get<Sales>('/api/admin/overview/sales') })

export const useAgenda = (from: Date, to: Date) => useQuery({
  queryKey: ['overview', 'agenda', from.toISOString(), to.toISOString()],
  queryFn: () => get<{ events: AgendaEvent[] }>(`/api/admin/overview/agenda?from=${from.toISOString()}&to=${to.toISOString()}`),
  placeholderData: keepPreviousData,
})

export const useInsights = () => useQuery({ queryKey: ['overview', 'insights'], queryFn: () => get<Insights>('/api/admin/overview/insights') })

/** Candidatures marchands en attente — servies par merchantgo (peut être indisponible). */
export const usePendingApplications = () => useQuery({
  queryKey: ['merchant-applications-pending-count'],
  queryFn: async () => (await api.get('/api/admin/merchant-applications?status=submitted&limit=1')).data.data.total as number,
  retry: false,
})
