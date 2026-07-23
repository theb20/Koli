import { http, HttpResponse, delay } from 'msw'
import { BASE } from '@/lib/api'
import { db, nextId } from '../data/db'
import type { Paginated, Product, ProductInput } from '@/types'

export const productHandlers = [
  http.get(`${BASE}/api/products`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')?.toLowerCase().trim()
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

    let items = [...db.products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (status && status !== 'all') items = items.filter((p) => p.status === status)
    if (search) {
      items = items.filter(
        (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search),
      )
    }

    const total = items.length
    const start = (page - 1) * pageSize
    const paged = items.slice(start, start + pageSize)

    const response: Paginated<Product> = { items: paged, total, page, pageSize }
    return HttpResponse.json(response)
  }),

  http.post(`${BASE}/api/products`, async ({ request }) => {
    await delay(300)
    const input = (await request.json()) as ProductInput
    const now = new Date().toISOString()
    const product: Product = {
      ...input,
      id: nextId('prod'),
      sku: `SKG-${Math.floor(1000 + Math.random() * 9000)}`,
      soldCount: 0,
      revenue: 0,
      createdAt: now,
      updatedAt: now,
    }
    db.products.unshift(product)
    return HttpResponse.json(product, { status: 201 })
  }),

  http.patch(`${BASE}/api/products/:id`, async ({ request, params }) => {
    await delay(300)
    const index = db.products.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Produit introuvable' }, { status: 404 })
    const patch = (await request.json()) as Partial<ProductInput>
    db.products[index] = { ...db.products[index], ...patch, updatedAt: new Date().toISOString() }
    return HttpResponse.json(db.products[index])
  }),

  http.post(`${BASE}/api/products/:id/duplicate`, async ({ params }) => {
    await delay(300)
    const source = db.products.find((p) => p.id === params.id)
    if (!source) return HttpResponse.json({ message: 'Produit introuvable' }, { status: 404 })
    const now = new Date().toISOString()
    const copy: Product = {
      ...source,
      id: nextId('prod'),
      sku: `SKG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: `${source.name} (copie)`,
      status: 'draft',
      soldCount: 0,
      revenue: 0,
      createdAt: now,
      updatedAt: now,
    }
    db.products.unshift(copy)
    return HttpResponse.json(copy, { status: 201 })
  }),

  http.delete(`${BASE}/api/products/:id`, async ({ params }) => {
    await delay(250)
    const index = db.products.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Produit introuvable' }, { status: 404 })
    db.products.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),
]
