import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db, nextId } from '../data/db'
import type { Promotion, PromotionInput } from '@/types'

function statusFromDates(startDate: string, endDate: string): Promotion['status'] {
  const now = Date.now()
  if (new Date(startDate).getTime() > now) return 'scheduled'
  if (new Date(endDate).getTime() < now) return 'expired'
  return 'active'
}

export const promotionHandlers = [
  http.get(`${BASE}/api/promotions`, async () => {
    await delay(200)
    return HttpResponse.json([...db.promotions].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)))
  }),

  http.post(`${BASE}/api/promotions`, async ({ request }) => {
    await delay(300)
    const input = (await request.json()) as PromotionInput
    const promotion: Promotion = {
      ...input,
      id: nextId('promo'),
      usageCount: 0,
      status: statusFromDates(input.startDate, input.endDate),
    }
    db.promotions.unshift(promotion)
    return HttpResponse.json(promotion, { status: 201 })
  }),

  http.patch(`${BASE}/api/promotions/:id`, async ({ request, params }) => {
    await delay(300)
    const index = db.promotions.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Promotion introuvable' }, { status: 404 })
    const patch = (await request.json()) as Partial<PromotionInput>
    const merged = { ...db.promotions[index], ...patch }
    merged.status = merged.status === 'draft' ? 'draft' : statusFromDates(merged.startDate, merged.endDate)
    db.promotions[index] = merged
    return HttpResponse.json(merged)
  }),

  http.delete(`${BASE}/api/promotions/:id`, async ({ params }) => {
    await delay(250)
    const index = db.promotions.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Promotion introuvable' }, { status: 404 })
    db.promotions.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),
]
