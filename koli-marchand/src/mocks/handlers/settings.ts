import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db, nextId } from '../data/db'
import type { PayoutMethod, ShopSettings } from '@/types'

export const settingsHandlers = [
  http.get(`${BASE}/api/settings`, async () => {
    await delay(150)
    return HttpResponse.json(db.settings)
  }),

  http.patch(`${BASE}/api/settings`, async ({ request }) => {
    await delay(300)
    const patch = (await request.json()) as Partial<ShopSettings>
    db.settings = { ...db.settings, ...patch }
    return HttpResponse.json(db.settings)
  }),

  http.post(`${BASE}/api/settings/payout-methods`, async ({ request }) => {
    await delay(300)
    const input = (await request.json()) as Omit<PayoutMethod, 'id'>
    const method: PayoutMethod = { ...input, id: nextId('pm') }
    if (method.isDefault) {
      db.settings.payoutMethods = db.settings.payoutMethods.map((m) => ({ ...m, isDefault: false }))
    }
    db.settings.payoutMethods.push(method)
    return HttpResponse.json(method, { status: 201 })
  }),

  http.delete(`${BASE}/api/settings/payout-methods/:id`, async ({ params }) => {
    await delay(250)
    db.settings.payoutMethods = db.settings.payoutMethods.filter((m) => m.id !== params.id)
    return HttpResponse.json({ success: true })
  }),
]
