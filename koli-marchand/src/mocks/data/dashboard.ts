import type { BestSellingProduct, DashboardData, Kpi, Order, Product, RevenuePoint } from '@/types'
import { fmtFcfa } from '@/lib/format'

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function billableOrders(orders: Order[]) {
  return orders.filter((o) => o.status !== 'cancelled')
}

export function computeRevenueByDay(orders: Order[]): RevenuePoint[] {
  const days: RevenuePoint[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    const amount = billableOrders(orders)
      .filter((o) => isSameDay(new Date(o.createdAt), day))
      .reduce((sum, o) => sum + o.totalAmount, 0)

    days.push({
      date: day.toISOString(),
      label: day.toLocaleDateString('fr-FR', { weekday: 'short' }),
      amount,
      isToday: i === 0,
    })
  }
  return days
}

export function computeBestSellers(products: Product[], limit = 5): BestSellingProduct[] {
  return [...products]
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, limit)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      thumbnail: p.images[0],
      soldCount: p.soldCount,
      revenue: p.revenue,
    }))
}

function ordersInLastNDays(orders: Order[], n: number, offset = 0) {
  const now = Date.now()
  const from = now - (n + offset) * 86_400_000
  const to = now - offset * 86_400_000
  return billableOrders(orders).filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return t >= from && t < to
  })
}

export function computeKpis(orders: Order[]): Kpi[] {
  const last7 = ordersInLastNDays(orders, 7)
  const prev7 = ordersInLastNDays(orders, 7, 7)

  const revenue = last7.reduce((sum, o) => sum + o.totalAmount, 0)
  const prevRevenue = prev7.reduce((sum, o) => sum + o.totalAmount, 0)

  const ordersCount = last7.length
  const prevOrdersCount = prev7.length

  const avgBasket = ordersCount > 0 ? revenue / ordersCount : 0
  const prevAvgBasket = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0

  const conversionRate = 3.2
  const prevConversionRate = 2.9

  return [
    {
      key: 'revenue',
      label: "Chiffre d'affaires",
      value: fmtFcfa(revenue),
      rawValue: revenue,
      change: pctChange(revenue, prevRevenue),
    },
    {
      key: 'orders',
      label: 'Commandes',
      value: String(ordersCount),
      rawValue: ordersCount,
      change: pctChange(ordersCount, prevOrdersCount),
    },
    {
      key: 'averageBasket',
      label: 'Panier moyen',
      value: fmtFcfa(avgBasket),
      rawValue: avgBasket,
      change: pctChange(avgBasket, prevAvgBasket),
    },
    {
      key: 'conversionRate',
      label: 'Taux de conversion',
      value: `${conversionRate.toFixed(1)}%`,
      rawValue: conversionRate,
      change: pctChange(conversionRate, prevConversionRate),
    },
  ]
}

export function computeDashboard(orders: Order[], products: Product[]): DashboardData {
  return {
    kpis: computeKpis(orders),
    revenueByDay: computeRevenueByDay(orders),
    bestSellers: computeBestSellers(products),
    recentOrders: [...orders]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5),
  }
}
