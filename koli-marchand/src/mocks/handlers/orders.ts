import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db } from '../data/db'
import type { OrderStatus, Paginated, Order } from '@/types'

export const orderHandlers = [
  http.get(`${BASE}/api/orders`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')?.toLowerCase().trim()
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

    let items = [...db.orders]
    if (status && status !== 'all') items = items.filter((o) => o.status === status)
    if (search) {
      items = items.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customer.name.toLowerCase().includes(search),
      )
    }

    const total = items.length
    const start = (page - 1) * pageSize
    const paged = items.slice(start, start + pageSize)

    const response: Paginated<Order> = { items: paged, total, page, pageSize }
    return HttpResponse.json(response)
  }),

  http.get(`${BASE}/api/orders/:id`, async ({ params }) => {
    await delay(150)
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return HttpResponse.json({ message: 'Commande introuvable' }, { status: 404 })
    return HttpResponse.json(order)
  }),

  http.patch(`${BASE}/api/orders/:id/status`, async ({ request, params }) => {
    await delay(300)
    const index = db.orders.findIndex((o) => o.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Commande introuvable' }, { status: 404 })
    const { status } = (await request.json()) as { status: OrderStatus }
    db.orders[index] = { ...db.orders[index], status, updatedAt: new Date().toISOString() }
    return HttpResponse.json(db.orders[index])
  }),
]
