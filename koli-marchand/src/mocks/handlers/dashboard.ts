import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db } from '../data/db'
import { computeDashboard } from '../data/dashboard'

export const dashboardHandlers = [
  http.get(`${BASE}/api/dashboard`, async () => {
    await delay(250)
    return HttpResponse.json(computeDashboard(db.orders, db.products))
  }),
]
