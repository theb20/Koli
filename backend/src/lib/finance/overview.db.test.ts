/* ─────────────────────────────────────────────────────────────
   Test d'intégration des agrégations SQL sur une VRAIE base Postgres
   locale de test (jamais la prod) : `npm run test:db`. Ignoré par
   `npm test`. Les données sont créées en janvier 2000 (période isolée des
   données de seed) puis supprimées.
───────────────────────────────────────────────────────────── */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const url = process.env.DATABASE_URL ?? ''
const enabled = process.env.FINANCE_DB_TESTS === '1' && /@(localhost|127\.0\.0\.1)[:/]/.test(url) && /_test(\?|$)/.test(url)

describe.skipIf(!enabled)('financeOverview (SQL) — base de test locale', async () => {
  const { prisma } = await import('../prisma')
  const { snapshotOrderFinancials } = await import('./snapshot')
  const { financeOverview, periodRange } = await import('./overview')

  const tag = `fin-test-${Date.now()}`
  const range = periodRange('custom', { from: '2000-01-01', to: '2000-01-31' })
  const ids = { suppliers: [] as number[], products: [] as number[], orders: [] as string[] }

  async function product(name: string, price: number, supplierId: number, supplierPrice: number | null) {
    const p = await prisma.product.create({
      data: { name: `${tag} ${name}`, brand: 'Test', category: 'test', price, sourcing: { create: { supplierId, supplierPrice } } },
    })
    ids.products.push(p.id)
    return p
  }

  let n = 0
  async function order(o: {
    status?: string; paidAt: Date; subtotal: number; promoDiscount?: number; taxAmount: number; shippingCost: number; total: number
    items: { productId: number; price: number; qty: number }[]
  }) {
    const created = await prisma.order.create({
      data: {
        orderNumber: `${tag}-${++n}`, clientPrenom: 'T', clientNom: 'T', clientEmail: 't@example.test', clientTelephone: '0',
        deliveryMethod: 'standard', shippingAddress: '{}', paymentMethod: 'cash', paymentStatus: 'paid',
        status: o.status ?? 'delivered', paidAt: o.paidAt, createdAt: o.paidAt,
        subtotal: o.subtotal, promoDiscount: o.promoDiscount ?? 0, taxRate: 18, taxAmount: o.taxAmount,
        shippingCost: o.shippingCost, total: o.total,
        items: { create: o.items.map(i => ({ ...i, name: `${tag} item`, brand: 'Test', image: '' })) },
      },
      include: { items: true },
    })
    ids.orders.push(created.id)
    return created
  }

  let result: Awaited<ReturnType<typeof financeOverview>>
  let productA: { id: number }

  beforeAll(async () => {
    const margin = await prisma.supplier.create({ data: { name: `${tag} Marge`, mode: 'MARGIN' } })
    const commission = await prisma.supplier.create({ data: { name: `${tag} Commission`, mode: 'COMMISSION', commissionRate: 15 } })
    ids.suppliers.push(margin.id, commission.id)
    productA = await product('A', 18_000, margin.id, 12_000)
    const productB = await product('B', 10_000, commission.id, null)

    // 1. A×2 + B×1, livraison 1 500 (coût réel 2 000)
    const o1 = await order({ paidAt: new Date('2000-01-10T10:00:00Z'), subtotal: 46_000, taxAmount: 8_280, shippingCost: 1_500, total: 55_780,
      items: [{ productId: productA.id, price: 18_000, qty: 2 }, { productId: productB.id, price: 10_000, qty: 1 }] })
    await snapshotOrderFinancials(o1.id)
    await prisma.orderFinancials.update({ where: { orderId: o1.id }, data: { shippingActualCost: 2_000 } })

    // 2. A×3, promo 3 000, puis 1 unité remboursée (20 239 TTC)
    const o2 = await order({ paidAt: new Date('2000-01-12T10:00:00Z'), subtotal: 54_000, promoDiscount: 3_000, taxAmount: 9_720, shippingCost: 0, total: 60_720,
      items: [{ productId: productA.id, price: 18_000, qty: 3 }] })
    await snapshotOrderFinancials(o2.id)
    const user = await prisma.user.findFirst({ select: { id: true } })
    await prisma.orderReturn.create({ data: {
      orderId: o2.id, userId: user!.id, status: 'refunded', reason: 'other', refundAmount: 20_239,
      items: { create: [{ orderItemId: o2.items[0]!.id, quantity: 1 }] },
    } })

    // 3. Commande ancienne : coût inconnu (comme posé par la migration)
    const o3 = await order({ paidAt: new Date('2000-01-14T10:00:00Z'), subtotal: 10_000, taxAmount: 1_800, shippingCost: 0, total: 11_800,
      items: [{ productId: productB.id, price: 10_000, qty: 1 }] })
    await prisma.orderFinancials.create({ data: { orderId: o3.id, costKnown: false, snapshotAt: new Date() } })

    // 4 et 5. Annulée / remboursée : hors CA et hors marges
    for (const status of ['cancelled', 'refunded']) {
      const o = await order({ status, paidAt: new Date('2000-01-15T10:00:00Z'), subtotal: 18_000, taxAmount: 3_240, shippingCost: 0, total: 21_240,
        items: [{ productId: productA.id, price: 18_000, qty: 1 }] })
      await snapshotOrderFinancials(o.id)
    }

    // Changer les prix APRÈS coup ne doit rien changer (valeurs figées)
    await prisma.productSourcing.update({ where: { productId: productA.id }, data: { supplierPrice: 1 } })
    await prisma.supplier.update({ where: { id: commission.id }, data: { commissionRate: 90 } })
    await prisma.product.update({ where: { id: productA.id }, data: { price: 99_999 } })

    result = await financeOverview(range)
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } })
    await prisma.product.deleteMany({ where: { id: { in: ids.products } } })
    await prisma.supplier.deleteMany({ where: { id: { in: ids.suppliers } } })
  })

  it('volume d\'affaires (niveau commande, remboursements déduits)', () => {
    expect(result.volume).toMatchObject({
      orders: 3,
      revenueTtc: 55_780 + (60_720 - 20_239) + 11_800,
      revenueHt: 46_000 + (51_000 - 17_152) + 10_000, // 20 239 TTC → 17 152 HT
      avgBasketTtc: 36_020,
    })
  })

  it('coûts', () => {
    expect(result.costs).toEqual({ cogs: 48_000, supplierPayout: 56_500, vatCollected: 8_280 + (9_720 - 3_087) + 1_800, shippingCost: 2_000 })
  })

  it('rentabilité (valeurs figées, commande sans coût exclue)', () => {
    expect(result.profit).toMatchObject({
      grossMargin: 12_000 + 1_500 + 10_000,
      commissions: 1_500,
      marginRatePct: 29.4,          // 23 500 / 80 000
      avgMarginPerOrder: 11_750,
      shippingResult: -500,
    })
    expect(result.profit.topProducts.map(p => [p.id, p.margin, p.qty])).toEqual([[productA.id, 22_000, 4], [expect.any(Number), 1_500, 1]])
    expect(result.profit.topSuppliers.map(s => [s.kind, s.margin])).toEqual([['supplier', 22_000], ['supplier', 1_500]])
  })

  it('couverture : commandes exclues des marges et coûts de livraison manquants', () => {
    expect(result.coverage).toMatchObject({ marginOrders: 2, marginRevenueHt: 80_000, excludedOrders: 1, shippingUnknownOrders: 2 })
  })

  it('le figement est idempotent', async () => {
    await snapshotOrderFinancials(ids.orders[0]!)
    expect(await prisma.orderItemFinancials.count({ where: { orderId: ids.orders[0]! } })).toBe(2)
  })
})
