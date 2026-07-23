import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db } from '../data/db'
import { computeCategorySales, generateMonthlySales } from '../data/stats'

export const statsHandlers = [
  http.get(`${BASE}/api/stats`, async () => {
    await delay(250)
    return HttpResponse.json({
      categorySales: computeCategorySales(db.products),
      periodSales: generateMonthlySales(),
    })
  }),
]
