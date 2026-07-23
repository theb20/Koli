import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db } from '../data/db'
import type { Paginated, Customer } from '@/types'

export const customerHandlers = [
  http.get(`${BASE}/api/customers`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase().trim()
    const segment = url.searchParams.get('segment')
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

    let items = [...db.customers].sort((a, b) => b.totalSpent - a.totalSpent)
    if (segment && segment !== 'all') items = items.filter((c) => c.segment === segment)
    if (search) {
      items = items.filter(
        (c) => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search),
      )
    }

    const total = items.length
    const start = (page - 1) * pageSize
    const response: Paginated<Customer> = {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    }
    return HttpResponse.json(response)
  }),

  http.get(`${BASE}/api/customers/:id`, async ({ params }) => {
    await delay(150)
    const customer = db.customers.find((c) => c.id === params.id)
    if (!customer) return HttpResponse.json({ message: 'Client introuvable' }, { status: 404 })
    const orders = db.orders.filter((o) => o.customer.id === customer.id)
    return HttpResponse.json({ customer, orders })
  }),
]
