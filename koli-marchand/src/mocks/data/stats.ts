import type { CategorySales, PeriodSales, Product } from '@/types'
import { mulberry32, randomInt } from './rng'

export function computeCategorySales(products: Product[]): CategorySales[] {
  const byCategory = new Map<string, CategorySales>()
  for (const p of products) {
    const entry = byCategory.get(p.category) ?? { category: p.category, revenue: 0, unitsSold: 0 }
    entry.revenue += p.revenue
    entry.unitsSold += p.soldCount
    byCategory.set(p.category, entry)
  }
  return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue)
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export function generateMonthlySales(): PeriodSales[] {
  const rand = mulberry32(555)
  const now = new Date()
  const points: PeriodSales[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const base = 900_000 + (11 - i) * 45_000
    points.push({
      label: MONTHS[d.getMonth()],
      revenue: base + randomInt(rand, -120_000, 180_000),
      orders: randomInt(rand, 60, 220),
    })
  }
  return points
}
