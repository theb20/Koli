/* ─────────────────────────────────────────────────────────────
   Finances [ADMIN] — /api/admin/finance. Indicateurs de la Vue d'ensemble
   (lib/finance/overview.ts) et données financières internes d'une
   commande (coût de livraison réel, lignes figées), jamais exposées par
   GET /api/orders/:id qui est aussi lu par le client.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, validateQuery, zCuidIdParam } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { financeOverview, periodRange, PERIOD_PRESETS, type PeriodPreset } from '../lib/finance/overview'
import { snapshotPendingOrders } from '../lib/finance/snapshot'
import { orderGrossMargin, shippingResult } from '../lib/finance/formulas'

const router = Router()
router.use(requireAdmin)

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date AAAA-MM-JJ attendue')
const overviewQuery = z.object({
  preset: z.enum(PERIOD_PRESETS).default('month'),
  from:   isoDate.optional(),
  to:     isoDate.optional(),
}).refine(q => q.preset !== 'custom' || (q.from && q.to && q.from <= q.to), { message: 'Période personnalisée invalide', path: ['from'] })

/* ── GET /api/admin/finance/overview?preset=month|quarter|year|custom&from&to ── */
router.get('/overview', validateQuery(overviewQuery), async (req, res) => {
  try {
    const q = req.query as unknown as { preset: PeriodPreset; from?: string; to?: string }
    await snapshotPendingOrders()
    const range = periodRange(q.preset, q.from && q.to ? { from: q.from, to: q.to } : undefined)
    res.json({ success: true, data: { preset: q.preset, ...(await financeOverview(range)) } })
  } catch (err) {
    logger.error('[admin-finance/overview]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/admin/finance/orders/:id — encart « Rentabilité » du détail commande ── */
router.get('/orders/:id', validateParams(zCuidIdParam), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where:  { id: req.params['id']! },
      select: {
        shippingCost: true, paidAt: true,
        financials: { select: { shippingActualCost: true, costKnown: true, snapshotAt: true } },
        items: { select: { id: true, name: true, financials: true } },
      },
    })
    if (!order) { res.status(404).json({ success: false, message: 'Commande introuvable' }); return }
    const lines = order.items.filter(i => i.financials).map(i => ({ name: i.name, ...i.financials! }))
    const actual = order.financials?.shippingActualCost ?? null
    res.json({ success: true, data: {
      paidAt: order.paidAt,
      snapshotAt: order.financials?.snapshotAt ?? null,
      costKnown: order.financials?.costKnown ?? false,
      shippingFeeCharged: order.shippingCost,
      shippingActualCost: actual,
      shippingResult: shippingResult(order.shippingCost, actual),
      margin: order.financials?.costKnown ? orderGrossMargin(lines) : null,
      lines,
    } })
  } catch (err) {
    logger.error('[admin-finance/order]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/admin/finance/orders/:id/shipping-cost — coût réel de livraison (null = inconnu) ── */
const shippingCostSchema = z.object({ shippingActualCost: z.number().int().nonnegative().max(10_000_000).nullable() })

router.put('/orders/:id/shipping-cost', validateParams(zCuidIdParam), validate(shippingCostSchema), async (req, res) => {
  try {
    const orderId = req.params['id']!
    const { shippingActualCost } = req.body as z.infer<typeof shippingCostSchema>
    const exists = await prisma.order.count({ where: { id: orderId } })
    if (!exists) { res.status(404).json({ success: false, message: 'Commande introuvable' }); return }
    await prisma.orderFinancials.upsert({
      where:  { orderId },
      create: { orderId, shippingActualCost },
      update: { shippingActualCost },
    })
    logAdminAction(req, { action: 'order.shippingActualCost.update', targetType: 'Order', targetId: orderId, metadata: { shippingActualCost } })
    res.json({ success: true, data: { shippingActualCost } })
  } catch (err) {
    logger.error('[admin-finance/shipping-cost]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
