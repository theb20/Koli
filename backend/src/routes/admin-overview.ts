/* ─────────────────────────────────────────────────────────────
   Vue d'ensemble du backoffice (koli-admin) — agrégats calculés côté
   serveur (SQL), en remplacement des calculs faits dans le navigateur sur
   les 200 dernières commandes. Routes AJOUTÉES : aucun contrat existant
   n'est modifié. Fuseau Africa/Abidjan = UTC (pas de décalage à gérer).

   Définitions :
   - CA = somme des `total` des commandes PAYÉES, hors annulées/remboursées
     et hors corbeille (deletedAt).
   - Origine « marchands » = commande contenant au moins un produit de
     boutique marchande (Product.storeId non nul) ; « skignas » = aucune.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'
import { logger } from '../lib/logger'

const router = Router()
router.use(requireAdmin)

const DAY = 24 * 3600 * 1000
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const startOfMonth = (d: Date, offset = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1))

/** Filtre SQL d'origine des commandes (voir en-tête). */
function originSql(origin: string): Prisma.Sql {
  const hasMerchantItem = Prisma.sql`EXISTS (SELECT 1 FROM order_items oi JOIN products p ON p.id = oi."productId" WHERE oi."orderId" = o.id AND p."storeId" IS NOT NULL)`
  if (origin === 'merchants') return Prisma.sql`AND ${hasMerchantItem}`
  if (origin === 'skignas')   return Prisma.sql`AND NOT ${hasMerchantItem}`
  return Prisma.empty
}

const PAID = Prisma.sql`o."paymentStatus" = 'paid' AND o.status NOT IN ('cancelled','refunded') AND o."deletedAt" IS NULL`

/* ── GET /api/admin/overview/counters — pastilles de la sidebar ── */
router.get('/counters', async (req, res) => {
  try {
    const [pendingOrders, requestedReturns, newProductRequests, unreadContacts, unreadNotifications] = await Promise.all([
      prisma.order.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.orderReturn.count({ where: { status: 'requested' } }),
      prisma.productRequest.count({ where: { status: 'new' } }),
      prisma.contactMessage.count({ where: { status: 'new' } }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ])
    res.json({ success: true, data: { pendingOrders, requestedReturns, newProductRequests, unreadContacts, unreadNotifications } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/overview/performance — KPI de période + précédente ── */
const perfQuery = z.object({
  period: z.enum(['7d', '30d', 'month', 'lastMonth']).default('30d'),
  origin: z.enum(['all', 'skignas', 'merchants']).default('all'),
})

function periodRange(period: z.infer<typeof perfQuery>['period']) {
  const now = new Date()
  const tomorrow = new Date(startOfDay(now).getTime() + DAY)
  switch (period) {
    case '7d':  { const from = new Date(tomorrow.getTime() - 7 * DAY);  return { from, to: tomorrow, prevFrom: new Date(from.getTime() - 7 * DAY),  prevTo: from } }
    case '30d': { const from = new Date(tomorrow.getTime() - 30 * DAY); return { from, to: tomorrow, prevFrom: new Date(from.getTime() - 30 * DAY), prevTo: from } }
    case 'month': {
      // Mois en cours vs même nombre de jours du mois précédent (comparaison équitable)
      const from = startOfMonth(now), elapsed = tomorrow.getTime() - from.getTime()
      const prevFrom = startOfMonth(now, -1)
      return { from, to: tomorrow, prevFrom, prevTo: new Date(Math.min(prevFrom.getTime() + elapsed, from.getTime())) }
    }
    case 'lastMonth': return { from: startOfMonth(now, -1), to: startOfMonth(now), prevFrom: startOfMonth(now, -2), prevTo: startOfMonth(now, -1) }
  }
}

async function periodKpis(from: Date, to: Date, origin: string) {
  const [row] = await prisma.$queryRaw<{ delivered: bigint; orders: bigint; paid_orders: bigint; revenue: bigint | null }[]>`
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'delivered')                    AS delivered,
      COUNT(*)                                                          AS orders,
      COUNT(*) FILTER (WHERE ${PAID})                                   AS paid_orders,
      COALESCE(SUM(o.total) FILTER (WHERE ${PAID}), 0)                  AS revenue
    FROM orders o
    WHERE o."deletedAt" IS NULL AND o."createdAt" >= ${from} AND o."createdAt" < ${to} ${originSql(origin)}`
  const newCustomers = await prisma.user.count({ where: { role: 'customer', createdAt: { gte: from, lt: to } } })
  const paid = Number(row?.paid_orders ?? 0)
  return {
    delivered: Number(row?.delivered ?? 0),
    orders: Number(row?.orders ?? 0),
    avgBasket: paid ? Math.round(Number(row?.revenue ?? 0) / paid) : 0,
    newCustomers,
  }
}

router.get('/performance', validateQuery(perfQuery), async (req, res) => {
  try {
    const { period, origin } = req.query as unknown as z.infer<typeof perfQuery>
    const r = periodRange(period)
    const [current, previous] = await Promise.all([periodKpis(r.from, r.to, origin), periodKpis(r.prevFrom, r.prevTo, origin)])
    res.json({ success: true, data: { period, origin, from: r.from, to: r.to, current, previous } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/overview/sales — CA des 6 derniers mois ── */
router.get('/sales', async (_req, res) => {
  try {
    const now = new Date()
    const from = startOfMonth(now, -5)
    const rows = await prisma.$queryRaw<{ month: Date; revenue: bigint; orders: bigint }[]>`
      SELECT date_trunc('month', o."createdAt") AS month, COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders
      FROM orders o WHERE ${PAID} AND o."createdAt" >= ${from}
      GROUP BY 1 ORDER BY 1`
    const months = Array.from({ length: 6 }, (_, i) => {
      const m = startOfMonth(now, i - 5)
      const r = rows.find(x => x.month.getTime() === m.getTime())
      return { month: m.toISOString().slice(0, 7), revenue: Number(r?.revenue ?? 0), orders: Number(r?.orders ?? 0) }
    })
    // Mois courant (incomplet) comparé au mois précédent sur le même nombre de jours
    const tomorrow = new Date(startOfDay(now).getTime() + DAY)
    const elapsed = tomorrow.getTime() - startOfMonth(now).getTime()
    const [prev] = await prisma.$queryRaw<{ revenue: bigint }[]>`
      SELECT COALESCE(SUM(o.total), 0) AS revenue FROM orders o
      WHERE ${PAID} AND o."createdAt" >= ${startOfMonth(now, -1)} AND o."createdAt" < ${new Date(startOfMonth(now, -1).getTime() + elapsed)}`
    const average = Math.round(months.reduce((s, m) => s + m.revenue, 0) / months.length)
    res.json({ success: true, data: { months, average, current: months[5]!.revenue, previousSamePeriod: Number(prev?.revenue ?? 0) } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/overview/agenda?from&to — événements planifiés ──
   Dérivés de données existantes (aucun modèle d'événement dédié) :
   deals (dates de promo), e-mails flash-deal, articles, boutiques. */
const agendaQuery = z.object({ from: z.coerce.date(), to: z.coerce.date() })

router.get('/agenda', validateQuery(agendaQuery), async (req, res) => {
  try {
    const { from, to } = req.query as unknown as z.infer<typeof agendaQuery>
    if (to.getTime() - from.getTime() > 62 * DAY) {
      res.status(400).json({ success: false, message: 'Période trop longue (62 jours max.)' })
      return
    }
    const [deals, dealEnds, mails, posts, stores] = await Promise.all([
      prisma.product.findMany({ where: { salePrice: { not: null }, saleStartsAt: { gte: from, lt: to } }, select: { id: true, name: true, saleStartsAt: true, saleEndsAt: true } }),
      prisma.product.findMany({ where: { salePrice: { not: null }, saleEndsAt: { gte: from, lt: to } }, select: { id: true, name: true, saleEndsAt: true } }),
      prisma.dealAnnouncement.findMany({ where: { sendAt: { gte: from, lt: to }, status: { not: 'cancelled' } }, select: { id: true, sendAt: true, status: true, recipientCount: true } }),
      prisma.blogPost.findMany({ where: { publishedAt: { gte: from, lt: to } }, select: { id: true, title: true, publishedAt: true, isPublished: true } }),
      prisma.sellerStore.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { id: true, name: true, createdAt: true } }),
    ])
    const events = [
      ...deals.map(d => ({ id: `deal-${d.id}`, type: 'deal', title: `Début du deal : ${d.name}`, start: d.saleStartsAt, end: d.saleEndsAt, link: `/products/${d.id}` })),
      ...dealEnds.map(d => ({ id: `deal-end-${d.id}`, type: 'deal', title: `Fin du deal : ${d.name}`, start: d.saleEndsAt, end: null, link: `/products/${d.id}` })),
      ...mails.map(m => ({ id: `mail-${m.id}`, type: 'email', title: m.status === 'sent' ? `E-mail flash-deal envoyé (${m.recipientCount ?? 0} destinataires)` : 'E-mail flash-deal planifié', start: m.sendAt, end: null, link: '/deals' })),
      ...posts.map(p => ({ id: `post-${p.id}`, type: 'blog', title: `${p.isPublished ? 'Article publié' : 'Article planifié'} : ${p.title}`, start: p.publishedAt, end: null, link: `/blog/${p.id}` })),
      ...stores.map(s => ({ id: `store-${s.id}`, type: 'store', title: `Nouvelle boutique : ${s.name}`, start: s.createdAt, end: null, link: `/stores/${s.id}` })),
    ].sort((a, b) => a.start!.getTime() - b.start!.getTime())
    res.json({ success: true, data: { events } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/overview/insights — rangées complémentaires ── */
const LATE_DAYS = 3
const LOW_STOCK = 5

router.get('/insights', async (_req, res) => {
  try {
    const now = new Date()
    const since30 = new Date(now.getTime() - 30 * DAY)
    const since6w = new Date(startOfDay(now).getTime() - 41 * DAY)

    const [pendingOrders, lateOrders, requestedReturns, newProductRequests, unreadContacts] = await Promise.all([
      prisma.order.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.order.count({ where: { status: { in: ['confirmed', 'processing'] }, deletedAt: null, createdAt: { lt: new Date(now.getTime() - LATE_DAYS * DAY) } } }),
      prisma.orderReturn.count({ where: { status: 'requested' } }),
      prisma.productRequest.count({ where: { status: 'new' } }),
      prisma.contactMessage.count({ where: { status: 'new' } }),
    ])

    const topProducts = await prisma.$queryRaw<{ id: number; name: string; image: string | null; qty: bigint; revenue: bigint }[]>`
      SELECT p.id, p.name, (SELECT url FROM product_images pi WHERE pi."productId" = p.id ORDER BY position LIMIT 1) AS image,
             SUM(oi.qty) AS qty, SUM(oi.price * oi.qty) AS revenue
      FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId"
      WHERE ${PAID} AND o."createdAt" >= ${since30}
      GROUP BY p.id ORDER BY revenue DESC LIMIT 5`
    // Tendance hebdomadaire (6 semaines) des top produits — sparkline
    const ids = topProducts.map(p => p.id)
    const weekly = ids.length ? await prisma.$queryRaw<{ id: number; week: number; qty: bigint }[]>`
      SELECT oi."productId" AS id, FLOOR(EXTRACT(EPOCH FROM (o."createdAt" - ${since6w}::timestamp)) / 604800)::int AS week, SUM(oi.qty) AS qty
      FROM order_items oi JOIN orders o ON o.id = oi."orderId"
      WHERE ${PAID} AND o."createdAt" >= ${since6w} AND oi."productId" IN (${Prisma.join(ids)})
      GROUP BY 1, 2` : []

    const topStores = await prisma.$queryRaw<{ id: number; name: string; logo: string | null; orders: bigint; revenue: bigint }[]>`
      SELECT s.id, s.name, s.logo, COUNT(DISTINCT o.id) AS orders, SUM(oi.price * oi.qty) AS revenue
      FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId" JOIN seller_stores s ON s.id = p."storeId"
      WHERE ${PAID} AND o."createdAt" >= ${since30}
      GROUP BY s.id ORDER BY revenue DESC LIMIT 5`

    const payments = await prisma.$queryRaw<{ method: string; orders: bigint; amount: bigint }[]>`
      SELECT o."paymentMethod" AS method, COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS amount
      FROM orders o WHERE ${PAID} AND o."createdAt" >= ${since30} GROUP BY 1`

    const cities = await prisma.$queryRaw<{ city: string; orders: bigint; revenue: bigint }[]>`
      SELECT COALESCE(NULLIF(TRIM(o."shippingAddress"::jsonb ->> 'ville'), ''), 'Non renseignée') AS city,
             COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS revenue
      FROM orders o WHERE ${PAID} AND o."createdAt" >= ${since30}
      GROUP BY 1 ORDER BY revenue DESC LIMIT 6`

    const lowStock = await prisma.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK } },
      orderBy: { stock: 'asc' }, take: 6,
      select: { id: true, name: true, stock: true, images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } }, store: { select: { name: true } } },
    })

    const [recentOrders, recentReviews, recentStores, recentReturns] = await Promise.all([
      prisma.order.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, orderNumber: true, clientPrenom: true, clientNom: true, total: true, createdAt: true } }),
      prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, rating: true, createdAt: true, authorName: true, user: { select: { prenom: true } }, product: { select: { id: true, name: true } } } }),
      prisma.sellerStore.findMany({ orderBy: { createdAt: 'desc' }, take: 2, select: { id: true, name: true, createdAt: true } }),
      prisma.orderReturn.findMany({ orderBy: { requestedAt: 'desc' }, take: 2, select: { id: true, requestedAt: true, order: { select: { orderNumber: true } } } }),
    ])
    const activity = [
      ...recentOrders.map(o => ({ id: `o-${o.id}`, type: 'order', text: `${o.clientPrenom} ${o.clientNom} a passé la commande ${o.orderNumber}`, amount: o.total, at: o.createdAt, link: `/orders/${o.id}` })),
      ...recentReviews.map(r => ({ id: `r-${r.id}`, type: 'review', text: `${r.user?.prenom ?? r.authorName ?? 'Un client'} a noté « ${r.product.name} » ${r.rating}/5`, amount: null, at: r.createdAt, link: '/reviews' })),
      ...recentStores.map(s => ({ id: `s-${s.id}`, type: 'store', text: `Boutique créée : ${s.name}`, amount: null, at: s.createdAt, link: `/stores/${s.id}` })),
      ...recentReturns.map(r => ({ id: `ret-${r.id}`, type: 'return', text: `Retour demandé sur ${r.order.orderNumber}`, amount: null, at: r.requestedAt, link: `/returns/${r.id}` })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8)

    res.json({ success: true, data: {
      todo: { pendingOrders, lateOrders, requestedReturns, newProductRequests, unreadContacts, lateDays: LATE_DAYS },
      topProducts: topProducts.map(p => ({
        id: p.id, name: p.name, image: p.image, qty: Number(p.qty), revenue: Number(p.revenue),
        trend: Array.from({ length: 6 }, (_, w) => Number(weekly.find(x => x.id === p.id && x.week === w)?.qty ?? 0)),
      })),
      topStores: topStores.map(s => ({ id: s.id, name: s.name, logo: s.logo, orders: Number(s.orders), revenue: Number(s.revenue) })),
      payments: payments.map(p => ({ method: p.method, orders: Number(p.orders), amount: Number(p.amount) })),
      cities: cities.map(c => ({ city: c.city, orders: Number(c.orders), revenue: Number(c.revenue) })),
      lowStock: lowStock.map(p => ({ id: p.id, name: p.name, stock: p.stock, image: p.images[0]?.url ?? null, store: p.store?.name ?? null, threshold: LOW_STOCK })),
      activity,
    } })
  } catch (err) {
    logger.error('[admin-overview/insights]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
