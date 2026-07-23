import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db, nextId } from '../data/db'
import type { Balance, Payout } from '@/types'

function computeBalance(): Balance {
  const paidThisMonth = db.payouts
    .filter((p) => p.status === 'paid' && new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0)
  const pending = db.payouts.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  return { available: 187_500, pending, paidThisMonth }
}

export const payoutHandlers = [
  http.get(`${BASE}/api/payouts/balance`, async () => {
    await delay(150)
    return HttpResponse.json(computeBalance())
  }),

  http.get(`${BASE}/api/payouts`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const items = [...db.payouts].sort((a, b) => (a.date < b.date ? 1 : -1))
    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: items.slice(start, start + pageSize),
      total: items.length,
      page,
      pageSize,
    })
  }),

  http.post(`${BASE}/api/payouts/withdraw`, async ({ request }) => {
    await delay(400)
    const { amount, methodId } = (await request.json()) as { amount: number; methodId: string }
    const method = db.settings.payoutMethods.find((m) => m.id === methodId)
    const payout: Payout = {
      id: nextId('pay'),
      reference: `VRST-${Math.floor(500000 + Math.random() * 100000)}`,
      date: new Date().toISOString(),
      method: method?.method ?? 'wave',
      amount,
      status: 'pending',
    }
    db.payouts.unshift(payout)
    return HttpResponse.json(payout, { status: 201 })
  }),
]
