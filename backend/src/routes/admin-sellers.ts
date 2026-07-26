import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { validateQuery, validateParams, zIntIdParam, zPaginationQuery } from '../middleware/validate'
import { getMerchantBillingBulk, isMerchantgoConfigured } from '../lib/merchantgo'

type MerchantgoBilling = {
  mode: 'commission' | 'subscription'
  commission_rate: number
  subscription_plan?: { name: string } | null
}
export type BillingSummary = { mode: 'commission' | 'subscription'; commissionRate: number; planName: string | null }

/*
 * Le modèle économique (commission/abonnement) vit dans merchantgo, pas
 * dans backend/ (Prisma) — cf. règle d'architecture paiements. Best-effort :
 * si merchantgo est indisponible ou mal configuré, les marchands restent
 * affichés sans cette info plutôt que de faire échouer toute la liste.
 */
async function fetchBillingByUserId(userIds: string[]): Promise<Record<string, BillingSummary>> {
  if (!isMerchantgoConfigured() || userIds.length === 0) return {}
  try {
    const res = await getMerchantBillingBulk(userIds) as { data?: Record<string, MerchantgoBilling> }
    const raw = res.data ?? {}
    const out: Record<string, BillingSummary> = {}
    for (const [userId, b] of Object.entries(raw)) {
      out[userId] = { mode: b.mode, commissionRate: b.commission_rate, planName: b.subscription_plan?.name ?? null }
    }
    return out
  } catch (err) {
    logger.error('[admin-sellers] échec récupération billing groupée', err)
    return {}
  }
}

const router = Router()
router.use(requireAdmin)

/*
 * Vue admin des VRAIS marchands (SellerStore, provisionnés après approbation
 * KYC — voir merchant-applications.ts) — distincte de /api/stores qui gère
 * l'ancien modèle Store (catalogue admin legacy, sans rapport). Avant cette
 * route, un marchand approuvé devenait invisible pour koli-admin : aucune
 * vue stats/actions au-delà de l'approbation initiale de sa candidature.
 */
const COUNTED_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered']

const listQuerySchema = zPaginationQuery.extend({ search: z.string().max(120).optional() })

/* ── GET /api/admin/sellers ──────────────────────────────────── */
router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const { page, limit, search } = req.query as unknown as z.infer<typeof listQuerySchema>

    const where = search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { user:  { email: { contains: search, mode: 'insensitive' as const } } },
        { user:  { prenom: { contains: search, mode: 'insensitive' as const } } },
        { user:  { nom: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {}

    const [total, stores] = await Promise.all([
      prisma.sellerStore.count({ where }),
      prisma.sellerStore.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, prenom: true, nom: true, email: true, isBanned: true } } },
      }),
    ])

    const billingByUserId = await fetchBillingByUserId(stores.map(s => s.user.id))

    const withStats = await Promise.all(stores.map(async (store) => {
      const [productCount, orderItems] = await Promise.all([
        prisma.product.count({ where: { storeId: store.id } }),
        prisma.orderItem.findMany({
          where: { product: { storeId: store.id } },
          select: { qty: true, price: true, order: { select: { id: true, status: true } } },
        }),
      ])
      const counted = orderItems.filter(i => COUNTED_STATUSES.includes(i.order.status))
      const orderIds = new Set(counted.map(i => i.order.id))
      const revenue = counted.reduce((sum, i) => sum + i.price * i.qty, 0)

      return {
        id:          store.id,
        name:        store.name,
        description: store.description,
        logo:        store.logo,
        phone:       store.phone,
        address:     store.address,
        isApproved:  store.isApproved,
        createdAt:   store.createdAt.toISOString(),
        owner:       store.user,
        productCount,
        orderCount: orderIds.size,
        revenue,
        billing: billingByUserId[store.user.id] ?? null,
      }
    }))

    res.json({ success: true, data: { sellers: withStats, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch (err) {
    logger.error('[admin-sellers list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/sellers/:id ──────────────────────────────── */
router.get('/:id', validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const store = await prisma.sellerStore.findUnique({
      where:   { id },
      include: { user: { select: { id: true, prenom: true, nom: true, email: true, isBanned: true, createdAt: true } } },
    })
    if (!store) { res.status(404).json({ success: false, message: 'Marchand introuvable' }); return }

    const [productCount, orderItems, products, billingByUserId] = await Promise.all([
      prisma.product.count({ where: { storeId: id } }),
      prisma.orderItem.findMany({
        where:  { product: { storeId: id } },
        select: { qty: true, price: true, order: { select: { id: true, orderNumber: true, status: true, createdAt: true, clientPrenom: true, clientNom: true, total: true } } },
      }),
      prisma.product.findMany({
        where:   { storeId: id },
        orderBy: { createdAt: 'desc' },
        take:    10,
        select:  { id: true, name: true, price: true, stock: true, isActive: true, images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } } },
      }),
      fetchBillingByUserId([store.user.id]),
    ])

    const byStatus: Record<string, number> = {}
    const ordersByOrderId = new Map<string, { orderNumber: string; status: string; createdAt: Date; client: string; total: number }>()
    for (const item of orderItems) {
      byStatus[item.order.status] = (byStatus[item.order.status] ?? 0) + 1
      if (!ordersByOrderId.has(item.order.id)) {
        ordersByOrderId.set(item.order.id, {
          orderNumber: item.order.orderNumber,
          status:      item.order.status,
          createdAt:   item.order.createdAt,
          client:      `${item.order.clientPrenom} ${item.order.clientNom}`,
          total:       item.order.total,
        })
      }
    }
    const counted = orderItems.filter(i => COUNTED_STATUSES.includes(i.order.status))
    const revenue = counted.reduce((sum, i) => sum + i.price * i.qty, 0)
    const recentOrders = [...ordersByOrderId.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(o => ({ ...o, createdAt: o.createdAt.toISOString() }))

    res.json({
      success: true,
      data: {
        seller: {
          id: store.id, name: store.name, description: store.description, logo: store.logo,
          banner: store.banner, phone: store.phone, address: store.address,
          isApproved: store.isApproved, createdAt: store.createdAt.toISOString(),
          owner: store.user,
          billing: billingByUserId[store.user.id] ?? null,
        },
        stats: { productCount, orderCount: new Set(orderItems.map(i => i.order.id)).size, revenue, byStatus },
        recentOrders,
        recentProducts: products.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, isActive: p.isActive, image: p.images[0]?.url ?? null })),
      },
    })
  } catch (err) {
    logger.error('[admin-sellers detail]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const statusSchema = z.object({ isApproved: z.boolean() })

/* ── PATCH /api/admin/sellers/:id/status — suspendre/réactiver ─ */
router.patch('/:id/status', validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { isApproved } = statusSchema.parse(req.body)

    const store = await prisma.sellerStore.update({ where: { id }, data: { isApproved } })

    logAdminAction(req, {
      action:     isApproved ? 'seller.reactivate' : 'seller.suspend',
      targetType: 'SellerStore',
      targetId:   String(id),
    })

    res.json({ success: true, data: { seller: store } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.issues[0]?.message ?? 'Requête invalide' }); return }
    logger.error('[admin-sellers status]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
