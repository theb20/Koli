/* ─────────────────────────────────────────────────────────────
   KPI de la page Statistiques (koli-admin /stats) — tout est calculé
   en SQL côté serveur. Routes AJOUTÉES (aucun contrat existant modifié).

   Période : from/to = dates incluses (YYYY-MM-DD, fuseau Abidjan = UTC).
   Comparaison : période précédente de même durée, ou mêmes dates N-1.
   CA = commandes PAYÉES hors annulées/remboursées/corbeille (comme la
   Vue d'ensemble).
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validate'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'

const router = Router()
router.use(requireAdmin)

const DAY = 24 * 3600 * 1000
const PAID = Prisma.sql`o."paymentStatus" = 'paid' AND o.status NOT IN ('cancelled','refunded') AND o."deletedAt" IS NULL`
const n = (v: unknown) => Number(v ?? 0)

type Range = { from: Date; to: Date }   // [from, to)

const periodQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  compare: z.enum(['previous', 'year', 'none']).default('previous'),
})

function parseRange(from: string, to: string): Range | null {
  const f = new Date(`${from}T00:00:00Z`), t = new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY)
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t <= f) return null
  if (t.getTime() - f.getTime() > 400 * DAY) return null
  return { from: f, to: t }
}

function compareRange(r: Range, mode: 'previous' | 'year'): Range {
  if (mode === 'year') {
    const shift = (d: Date) => new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()))
    return { from: shift(r.from), to: shift(r.to) }
  }
  const len = r.to.getTime() - r.from.getTime()
  return { from: new Date(r.from.getTime() - len), to: r.from }
}

const granularityFor = (r: Range): 'day' | 'week' | 'month' => {
  const days = (r.to.getTime() - r.from.getTime()) / DAY
  return days <= 45 ? 'day' : days <= 180 ? 'week' : 'month'
}

/* ── Indicateurs d'une période ─────────────────────────────── */
async function kpisFor(r: Range) {
  const inRange = Prisma.sql`o."deletedAt" IS NULL AND o."createdAt" >= ${r.from} AND o."createdAt" < ${r.to}`
  const [agg] = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COUNT(*)                                                                    AS orders,
      COUNT(*) FILTER (WHERE ${PAID})                                             AS paid_orders,
      COALESCE(SUM(o.total) FILTER (WHERE ${PAID}), 0)                            AS revenue,
      COUNT(*) FILTER (WHERE o.status = 'delivered')                              AS delivered,
      COUNT(*) FILTER (WHERE o.status = 'cancelled')                              AS cancelled,
      COALESCE(SUM(o."assistanceTotal") FILTER (WHERE ${PAID}), 0)                AS assistance,
      COALESCE(SUM(o.total) FILTER (WHERE ${PAID} AND o."paymentMethod" = 'online'), 0) AS online_revenue,
      COALESCE(SUM(o."taxAmount") FILTER (WHERE ${PAID}), 0)                      AS tax,
      COALESCE(SUM(o."promoDiscount") FILTER (WHERE ${PAID}), 0)                  AS discounts,
      AVG(EXTRACT(EPOCH FROM (o."deliveredAt" - o."createdAt")) / 86400)
        FILTER (WHERE o."deliveredAt" IS NOT NULL)                                AS delivery_days
    FROM orders o WHERE ${inRange}`
  const [items] = await prisma.$queryRaw<{ qty: unknown }[]>`
    SELECT COALESCE(SUM(oi.qty), 0) AS qty FROM order_items oi JOIN orders o ON o.id = oi."orderId" WHERE ${PAID} AND ${inRange}`
  const [returns] = await prisma.$queryRaw<{ c: unknown }[]>`
    SELECT COUNT(DISTINCT r."orderId") AS c FROM order_returns r JOIN orders o ON o.id = r."orderId"
    WHERE ${inRange} AND r.status <> 'cancelled'`
  const [repeat] = await prisma.$queryRaw<{ repeat: unknown; total: unknown }[]>`
    SELECT
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM orders p WHERE p."userId" = o."userId" AND p."createdAt" < o."createdAt"
          AND p."paymentStatus" = 'paid' AND p.status NOT IN ('cancelled','refunded') AND p."deletedAt" IS NULL
      )) AS repeat,
      COUNT(*) AS total
    FROM orders o WHERE ${PAID} AND ${inRange} AND o."userId" IS NOT NULL`
  const newCustomers = await prisma.user.count({ where: { role: 'customer', createdAt: { gte: r.from, lt: r.to } } })

  const orders = n(agg?.orders), paid = n(agg?.paid_orders), revenue = n(agg?.revenue), delivered = n(agg?.delivered)
  const ratio = (a: number, b: number) => (b ? a / b : null)
  return {
    revenue,
    orders,
    paidOrders: paid,
    avgBasket: paid ? Math.round(revenue / paid) : null,
    itemsPerOrder: ratio(n(items?.qty), paid),
    deliveryRate: ratio(delivered, orders),
    cancelRate: ratio(n(agg?.cancelled), orders),
    returnRate: ratio(n(returns?.c), delivered),
    avgDeliveryDays: agg?.delivery_days == null ? null : Number(agg.delivery_days),
    onlineShare: ratio(n(agg?.online_revenue), revenue),
    newCustomers,
    repeatRate: ratio(n(repeat?.repeat), n(repeat?.total)),
    assistanceRevenue: n(agg?.assistance),
    taxCollected: n(agg?.tax),
    discounts: n(agg?.discounts),
  }
}

/* ── Série temporelle (buckets remplis, zéros compris) ───────── */
async function seriesFor(r: Range, g: 'day' | 'week' | 'month') {
  const unit = Prisma.raw(`'${g}'`)
  const step = Prisma.raw(`'1 ${g}'`)
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    WITH buckets AS (
      -- Bornes converties explicitement en UTC (= Abidjan) : indépendant du fuseau de session Postgres
      SELECT generate_series(date_trunc(${unit}, ${r.from}::timestamptz AT TIME ZONE 'UTC'), (${r.to}::timestamptz AT TIME ZONE 'UTC') - interval '1 second', ${step}::interval) AS b
    ),
    o AS (
      SELECT date_trunc(${unit}, o."createdAt") AS b,
        COUNT(*) AS orders, COUNT(*) FILTER (WHERE ${PAID}) AS paid_orders,
        COALESCE(SUM(o.total) FILTER (WHERE ${PAID}), 0) AS revenue,
        COUNT(*) FILTER (WHERE o.status = 'delivered') AS delivered,
        COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled,
        COALESCE(SUM(o."assistanceTotal") FILTER (WHERE ${PAID}), 0) AS assistance,
        COALESCE(SUM(o.total) FILTER (WHERE ${PAID} AND o."paymentMethod" = 'online'), 0) AS online_revenue
      FROM orders o WHERE o."deletedAt" IS NULL AND o."createdAt" >= ${r.from} AND o."createdAt" < ${r.to}
      GROUP BY 1
    ),
    u AS (
      SELECT date_trunc(${unit}, "createdAt") AS b, COUNT(*) AS new_customers FROM users
      WHERE role = 'customer' AND "createdAt" >= ${r.from} AND "createdAt" < ${r.to} GROUP BY 1
    )
    SELECT buckets.b AS date, o.orders, o.paid_orders, o.revenue, o.delivered, o.cancelled, o.assistance, o.online_revenue, u.new_customers
    FROM buckets LEFT JOIN o ON o.b = buckets.b LEFT JOIN u ON u.b = buckets.b ORDER BY 1`
  return rows.map(x => ({
    date: (x.date as Date).toISOString().slice(0, 10),
    orders: n(x.orders), paidOrders: n(x.paid_orders), revenue: n(x.revenue),
    delivered: n(x.delivered), cancelled: n(x.cancelled), assistance: n(x.assistance),
    onlineRevenue: n(x.online_revenue), newCustomers: n(x.new_customers),
  }))
}

/* ── GET /api/admin/kpis?from&to&compare ─────────────────────── */
router.get('/', validateQuery(periodQuery), async (req, res) => {
  try {
    const { from, to, compare } = req.query as unknown as z.infer<typeof periodQuery>
    const r = parseRange(from, to)
    if (!r) { res.status(400).json({ success: false, message: 'Période invalide (400 jours max.)' }); return }
    const g = granularityFor(r)
    const c = compare === 'none' ? null : compareRange(r, compare)

    const [current, previous, series, previousSeries] = await Promise.all([
      kpisFor(r), c ? kpisFor(c) : null, seriesFor(r, g), c ? seriesFor(c, g) : null,
    ])
    res.json({ success: true, data: {
      range: { from: r.from, to: r.to }, compareRange: c, granularity: g, current, previous, series, previousSeries,
    } })
  } catch (err) {
    logger.error('[admin-kpis]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/kpis/breakdowns?from&to ──────────────────── */
router.get('/breakdowns', validateQuery(periodQuery), async (req, res) => {
  try {
    const { from, to } = req.query as unknown as z.infer<typeof periodQuery>
    const r = parseRange(from, to)
    if (!r) { res.status(400).json({ success: false, message: 'Période invalide' }); return }
    const inRange = Prisma.sql`o."createdAt" >= ${r.from} AND o."createdAt" < ${r.to}`

    const [categories, payments, cities, products] = await Promise.all([
      prisma.$queryRaw<{ name: string; revenue: unknown; qty: unknown }[]>`
        SELECT COALESCE(c.name, p.category, 'Sans catégorie') AS name, SUM(oi.price * oi.qty) AS revenue, SUM(oi.qty) AS qty
        FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId"
        LEFT JOIN categories c ON c.id = p."categoryId"
        WHERE ${PAID} AND ${inRange} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      prisma.$queryRaw<{ method: string; orders: unknown; amount: unknown }[]>`
        SELECT o."paymentMethod" AS method, COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS amount
        FROM orders o WHERE ${PAID} AND ${inRange} GROUP BY 1 ORDER BY 3 DESC`,
      prisma.$queryRaw<{ city: string; orders: unknown; revenue: unknown }[]>`
        SELECT COALESCE(NULLIF(TRIM(CASE WHEN o."shippingAddress" ~ '^\\s*\\{.*\\}\\s*$' THEN o."shippingAddress"::jsonb ->> 'ville' END), ''), 'Non renseignée') AS city,
               COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS revenue
        FROM orders o WHERE ${PAID} AND ${inRange} GROUP BY 1 ORDER BY 3 DESC LIMIT 8`,
      prisma.$queryRaw<{ id: number; name: string; qty: unknown; revenue: unknown; orders: unknown }[]>`
        SELECT p.id, p.name, SUM(oi.qty) AS qty, SUM(oi.price * oi.qty) AS revenue, COUNT(DISTINCT o.id) AS orders
        FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId"
        WHERE ${PAID} AND ${inRange} GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
    ])
    res.json({ success: true, data: {
      categories: categories.map(x => ({ name: x.name, revenue: n(x.revenue), qty: n(x.qty) })),
      payments: payments.map(x => ({ method: x.method, orders: n(x.orders), amount: n(x.amount) })),
      cities: cities.map(x => ({ city: x.city, orders: n(x.orders), revenue: n(x.revenue) })),
      products: products.map(x => ({ id: x.id, name: x.name, qty: n(x.qty), revenue: n(x.revenue), orders: n(x.orders) })),
    } })
  } catch (err) {
    logger.error('[admin-kpis/breakdowns]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Objectifs mensuels ────────────────────────────────────────── */
const targetsSchema = z.object({
  revenue:      z.number().int().nonnegative().nullable().optional(),
  orders:       z.number().int().nonnegative().nullable().optional(),
  newCustomers: z.number().int().nonnegative().nullable().optional(),
  avgBasket:    z.number().int().nonnegative().nullable().optional(),
})
type Targets = z.infer<typeof targetsSchema>

/** GET /api/admin/kpis/targets — objectifs + réalisé du mois en cours + projection */
router.get('/targets', async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 }, select: { kpiTargets: true } })
    const now = new Date()
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const k = await kpisFor({ from, to: new Date(today.getTime() + DAY) })
    res.json({ success: true, data: {
      targets: (settings.kpiTargets ?? {}) as Targets,
      month: from.toISOString().slice(0, 7),
      elapsedDays: Math.round((today.getTime() - from.getTime()) / DAY) + 1,
      daysInMonth: Math.round((nextMonth.getTime() - from.getTime()) / DAY),
      actual: { revenue: k.revenue, orders: k.orders, newCustomers: k.newCustomers, avgBasket: k.avgBasket },
    } })
  } catch (err) {
    logger.error('[admin-kpis/targets]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/** PUT /api/admin/kpis/targets — enregistre les objectifs (null = retirer) */
router.put('/targets', validate(targetsSchema), async (req, res) => {
  try {
    const body = req.body as Targets
    const clean = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== null && v > 0))
    await prisma.siteSettings.upsert({
      where: { id: 1 }, update: { kpiTargets: clean }, create: { id: 1, kpiTargets: clean },
    })
    logAdminAction(req, { action: 'kpi.targets.update', targetType: 'SiteSettings', targetId: '1', metadata: clean })
    res.json({ success: true, data: { targets: clean } })
  } catch (err) {
    logger.error('[admin-kpis/targets PUT]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
