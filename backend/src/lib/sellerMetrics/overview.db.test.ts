/* ─────────────────────────────────────────────────────────────
   Vérification du dictionnaire marchand sur une VRAIE base Postgres
   locale de test (jamais la prod) : `npm run test:db`. Ignoré par
   `npm test`. Jeu de commandes construit à la main en janvier 2003 (période
   isolée du seed) puis supprimé ; chaque attendu est calculé ci-dessous.
───────────────────────────────────────────────────────────── */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const url = process.env.DATABASE_URL ?? ''
const enabled = process.env.FINANCE_DB_TESTS === '1' && /@(localhost|127\.0\.0\.1)[:/]/.test(url) && /_test(\?|$)/.test(url)

describe.skipIf(!enabled)('sellerOverview (SQL) — base de test locale', async () => {
  const { prisma } = await import('../prisma')
  const { sellerOverview } = await import('./queries')
  const { resolvePeriod } = await import('./periods')

  const tag = `seller-test-${Date.now()}`
  const now = new Date('2003-01-31T12:00:00Z')
  const range = resolvePeriod('custom', { from: '2003-01-01', to: '2003-01-31' })
  const ids = { users: [] as string[], stores: [] as number[], products: [] as number[], orders: [] as string[] }

  async function store(name: string) {
    const u = await prisma.user.create({ data: { email: `${tag}-${name}@example.test`, password: 'x', prenom: 'T', nom: name, role: 'seller' } })
    const s = await prisma.sellerStore.create({ data: { userId: u.id, name: `${tag} ${name}`, isApproved: true } })
    ids.users.push(u.id); ids.stores.push(s.id)
    return s
  }
  async function product(storeId: number, name: string, price: number, stock: number) {
    const p = await prisma.product.create({ data: { name: `${tag} ${name}`, brand: 'T', category: 'test', price, stock, storeId } })
    ids.products.push(p.id)
    return p
  }
  let n = 0
  async function order(o: { email: string; paidAt: Date | null; status?: string; paymentStatus?: string; items: { productId: number; price: number; qty: number }[] }) {
    const total = o.items.reduce((s, i) => s + i.price * i.qty, 0)
    const created = await prisma.order.create({
      data: {
        orderNumber: `${tag}-${++n}`, clientPrenom: 'C', clientNom: 'C', clientEmail: o.email, clientTelephone: '0',
        deliveryMethod: 'standard', shippingAddress: '{}', paymentMethod: 'cash',
        paymentStatus: o.paymentStatus ?? 'paid', status: o.status ?? 'delivered',
        paidAt: o.paidAt, createdAt: o.paidAt ?? new Date('2003-01-21T10:00:00Z'),
        subtotal: total, taxRate: 0, taxAmount: 0, shippingCost: 0, total,
        items: { create: o.items.map(i => ({ ...i, name: 'x', brand: 'T', image: '' })) },
      },
      include: { items: true },
    })
    ids.orders.push(created.id)
    return created
  }

  let result: Awaited<ReturnType<typeof sellerOverview>>
  let storeId: number

  beforeAll(async () => {
    const mine = await store('Mine')
    const other = await store('Other')
    storeId = mine.id
    const p1 = await product(mine.id, 'P1', 10_000, 100)  // vendu, stock confortable
    await product(mine.id, 'P2', 5_000, 0)                // en rupture
    await product(mine.id, 'P3', 2_000, 50)               // aucune vente : couverture non calculable
    const p4 = await product(mine.id, 'P4', 1_000, 1)     // 8 vendus en 28 j, stock 1 → 3,5 jours
    const q = await product(other.id, 'Q', 99_000, 10)    // autre boutique : jamais compté

    // O1 — client A, payé le 10/01 : P1×2 (commission figée : versement 18 000) + P4×8 + Q (autre boutique)
    const o1 = await order({ email: 'A@Example.test', paidAt: new Date('2003-01-10T09:00:00Z'), items: [
      { productId: p1.id, price: 10_000, qty: 2 }, { productId: p4.id, price: 1_000, qty: 8 }, { productId: q.id, price: 99_000, qty: 1 }] })
    await prisma.orderItemFinancials.create({ data: {
      orderItemId: o1.items.find(i => i.productId === p1.id)!.id, orderId: o1.id, sellerStoreId: mine.id, supplierMode: 'COMMISSION',
      commissionRate: 10, unitSellingPriceHt: 10_000, unitSellingPriceTtc: 10_000, quantity: 2, vatAmount: 0,
      commissionAmount: 2_000, supplierPayout: 18_000, margin: 2_000 } })

    // O2 — client B, payé le 20/01, confirmé mais pas expédié (> 48 h) : P1×3, 1 unité remboursée
    const o2 = await order({ email: 'b@example.test', paidAt: new Date('2003-01-20T09:00:00Z'), status: 'confirmed', items: [{ productId: p1.id, price: 10_000, qty: 3 }] })
    await prisma.orderReturn.create({ data: { orderId: o2.id, userId: ids.users[0]!, status: 'refunded', reason: 'other', refundAmount: 10_000,
      items: { create: [{ orderItemId: o2.items[0]!.id, quantity: 1 }] } } })

    // Exclues : non payée, annulée, remboursée en totalité
    await order({ email: 'z@example.test', paidAt: null, paymentStatus: 'pending', status: 'pending', items: [{ productId: p1.id, price: 10_000, qty: 5 }] })
    await order({ email: 'z@example.test', paidAt: new Date('2003-01-15T09:00:00Z'), status: 'cancelled', items: [{ productId: p1.id, price: 10_000, qty: 4 }] })
    await order({ email: 'z@example.test', paidAt: new Date('2003-01-16T09:00:00Z'), status: 'refunded', items: [{ productId: p1.id, price: 10_000, qty: 4 }] })

    // Période précédente (décembre) : client A (sa 1re commande) ; an dernier (janvier 2002) : client C
    await order({ email: 'a@example.test', paidAt: new Date('2002-12-25T09:00:00Z'), items: [{ productId: p1.id, price: 10_000, qty: 1 }] })
    await order({ email: 'c@example.test', paidAt: new Date('2002-01-15T09:00:00Z'), items: [{ productId: p1.id, price: 10_000, qty: 1 }] })

    result = await sellerOverview(storeId, range, now)
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } })
    await prisma.product.deleteMany({ where: { id: { in: ids.products } } })
    await prisma.sellerStore.deleteMany({ where: { id: { in: ids.stores } } })
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  })

  it("[revenueHt] payées uniquement, ses lignes seulement, remboursements déduits", () => {
    // O1 : 20 000 + 8 000 (Q exclu) ; O2 : 3 − 1 remboursée = 2 × 10 000
    expect(result.kpis.revenueHt.current).toBe(48_000)
    expect(result.kpis.revenueHt.previous).toBe(10_000)
    expect(result.kpis.revenueHt.lastYear).toBe(10_000)
    expect(result.kpis.revenueHt.vsPrevious).toEqual({ abs: 38_000, pct: 380 })
  })

  it('[validOrders] [avgBasket]', () => {
    expect(result.kpis.validOrders.current).toBe(2)
    expect(result.kpis.avgBasket.current).toBe(24_000)
  })

  it('[newCustomers] première commande chez CE marchand, e-mail normalisé', () => {
    // A (A@Example.test = a@example.test) a acheté en décembre → pas nouveau en janvier ; B l'est
    expect(result.kpis.newCustomers.current).toBe(1)
    expect(result.kpis.newCustomers.previous).toBe(1)
    expect(result.kpis.newCustomers.lastYear).toBe(1)
  })

  it('[netRevenue] commission figée, couverture affichée', () => {
    expect(result.kpis.netRevenue.current).toBe(18_000)
    expect(result.kpis.netRevenue.coveragePct).toBe(41.7) // 20 000 / 48 000
  })

  it('[returnRate] unités en retour / unités vendues, en valeur aussi', () => {
    expect(result.kpis.returnRate.current).toBe(7.7) // 1 / 13
    expect(result.kpis.returnRate.returnedValue).toBe(10_000)
    expect(result.kpis.returnRate.vsPrevious.pct).toBeNull() // un taux varie en points, pas en %
  })

  it('[stockAtRisk] rupture + couverture < 7 jours', () => {
    expect(result.kpis.stockAtRisk).toMatchObject({ current: 2, outOfStock: 1, atRisk: 1 })
    expect(result.kpis.stockAtRisk.products[0]).toMatchObject({ stock: 1, days: 3.5 })
  })

  it('mini-courbes : 30 jours, ventes au jour du paiement', () => {
    const s = result.kpis.revenueHt.sparkline!
    expect(s).toHaveLength(30)
    expect(s.reduce((a, b) => a + b, 0)).toBe(48_000)
    expect(s[8]).toBe(28_000)  // 10/01 (série du 02/01 au 31/01)
    expect(s[18]).toBe(20_000) // 20/01
  })

  it('alertes triées par gravité, avec lien', () => {
    expect(result.alerts.map(a => a.id)).toEqual(['late-orders', 'out-of-stock', 'stock-at-risk'])
    expect(result.alerts.every(a => a.link.startsWith('/'))).toBe(true)
  })
})
