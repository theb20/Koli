import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zIntIdParam } from '../middleware/validate'
import { processDealAnnouncement } from '../lib/dealAnnouncements'
import { logger } from '../lib/logger'

const router = Router()

const createSchema = z.object({
  productIds:   z.array(z.number().int().positive()).min(1),
  segment:      z.enum(['all', 'buyers', 'inactive']),
  inactiveDays: z.number().int().positive().optional(),
  sendAt:       z.coerce.date().optional(), // absent/passé = envoi immédiat
})

/* ── GET /api/deal-announcements  [ADMIN] — historique ─────────── */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const announcements = await prisma.dealAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    res.json({
      success: true,
      data: announcements.map(a => ({ ...a, productIds: JSON.parse(a.productIds) })),
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/deal-announcements  [ADMIN] ──────────────────────── */
router.post('/', requireAdmin, validate(createSchema), async (req, res) => {
  try {
    const { productIds, segment, inactiveDays, sendAt } = req.body as z.infer<typeof createSchema>

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, salePrice: { not: null } },
      select: { id: true },
    })
    if (products.length === 0) {
      res.status(400).json({ success: false, message: 'Aucun des produits sélectionnés n\'a de promo active ou programmée' })
      return
    }

    const effectiveSendAt = sendAt ?? new Date()

    const announcement = await prisma.dealAnnouncement.create({
      data: {
        productIds: JSON.stringify(productIds),
        segment,
        inactiveDays: segment === 'inactive' ? (inactiveDays ?? 30) : null,
        sendAt: effectiveSendAt,
      },
    })

    if (effectiveSendAt <= new Date()) {
      processDealAnnouncement(announcement.id).catch(err => logger.error('[deal-announcement] envoi immédiat échoué', err))
    }

    res.status(201).json({ success: true, data: { ...announcement, productIds } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/deal-announcements/:id  [ADMIN] — annule une annonce programmée ── */
router.delete('/:id', requireAdmin, validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const updated = await prisma.dealAnnouncement.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'cancelled' },
    })
    if (updated.count === 0) {
      res.status(400).json({ success: false, message: 'Cette annonce ne peut plus être annulée' })
      return
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
