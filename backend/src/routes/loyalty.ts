import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { validate, validateParams, validateQuery, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'

const router = Router()

// 1 FCFA dépensé = 1 point (used by order service when crediting points)
const _POINTS_PER_FCFA = 1
export { _POINTS_PER_FCFA as POINTS_PER_FCFA }
// Valeur d'un point en FCFA lors du remboursement
const POINT_VALUE_FCFA = 0.5

/** Coupe-circuit + seuil — lus depuis SiteSettings, configurables par l'admin (voir settings.ts). */
export async function getLoyaltySettings() {
  const settings = await prisma.siteSettings.upsert({
    where:  { id: 1 },
    update: {},
    create: { id: 1 },
    select: { loyaltyEnabled: true, loyaltyMinRedeem: true },
  })
  return settings
}

/* GET /api/loyalty/me — solde + historique */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user, { loyaltyEnabled, loyaltyMinRedeem }] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { loyaltyPoints: true },
      }),
      getLoyaltySettings(),
    ])
    const transactions = await prisma.pointTransaction.findMany({
      where:   { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    })
    res.json({
      success: true,
      data: {
        points: user?.loyaltyPoints ?? 0,
        transactions,
        pointValue: POINT_VALUE_FCFA,
        enabled:   loyaltyEnabled,
        minRedeem: loyaltyMinRedeem,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/loyalty/redeem — utiliser des points (déduit lors de la commande) */
router.post('/redeem', requireAuth, validate(z.object({ points: z.number().int().positive() })), async (req, res) => {
  try {
    const { points } = req.body as { points: number }
    const userId = req.user!.userId

    const { loyaltyEnabled, loyaltyMinRedeem } = await getLoyaltySettings()
    if (!loyaltyEnabled) {
      res.status(400).json({ success: false, message: 'Le programme de fidélité est temporairement désactivé.' })
      return
    }
    if (points < loyaltyMinRedeem) {
      res.status(400).json({ success: false, message: `Il faut utiliser au moins ${loyaltyMinRedeem} points à la fois.` })
      return
    }

    // Décrémentation atomique — "loyaltyPoints >= points" et le décrément se
    // font dans la même requête (même garde-fou que le stock dans orders.ts) :
    // deux appels concurrents ne peuvent jamais tous les deux réussir sur le
    // même solde et le faire passer sous 0.
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, loyaltyPoints: { gte: points } },
        data:  { loyaltyPoints: { decrement: points } },
      })
      if (updated.count === 0) return null

      await tx.pointTransaction.create({
        data: { userId, type: 'redeem', points: -points, note: 'Utilisés pour une réduction' },
      })
      return tx.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } })
    })

    if (!result) {
      res.status(400).json({ success: false, message: 'Solde de points insuffisant.' })
      return
    }

    const discount = Math.floor(points * POINT_VALUE_FCFA)
    res.json({ success: true, data: { points, discount, remaining: result.loyaltyPoints } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   Administration — consultation + écritures correctrices.
   Jamais d'édition/suppression d'une transaction déjà écrite : une
   correction ajoute une nouvelle transaction motivée, comme en
   comptabilité — garantit que l'historique reflète fidèlement ce qui
   s'est réellement passé, y compris en cas d'accès admin compromis.
───────────────────────────────────────────────────────────── */

/* GET /api/loyalty/admin/all — liste des clients + solde, recherche par nom/email */
router.get('/admin/all', requireAdmin, validateQuery(zPaginationQuery.extend({ q: z.string().optional() })), async (req, res) => {
  try {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string }

    const where = q
      ? { OR: [{ prenom: { contains: q } }, { nom: { contains: q } }, { email: { contains: q } }] }
      : {}

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { loyaltyPoints: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, prenom: true, nom: true, email: true, loyaltyPoints: true },
      }),
    ])

    res.json({ success: true, data: { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/loyalty/admin/:id — solde + historique complet d'un client */
router.get('/admin/:id', requireAdmin, validateParams(zCuidIdParam), validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const { id } = req.params
    const { page, limit } = req.query as unknown as { page: number; limit: number }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, prenom: true, nom: true, email: true, loyaltyPoints: true },
    })
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }

    const [total, transactions] = await Promise.all([
      prisma.pointTransaction.count({ where: { userId: id } }),
      prisma.pointTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    res.json({ success: true, data: { user, transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const adjustSchema = z.object({
  points: z.number().int().min(-1_000_000).max(1_000_000).refine(n => n !== 0, 'Le nombre de points ne peut pas être 0'),
  note:   z.string().min(3, 'Un motif est requis').max(300),
})

/* POST /api/loyalty/admin/:id/adjust — écriture correctrice (+ ou − points) */
router.post('/admin/:id/adjust', requireAdmin, validateParams(zCuidIdParam), validate(adjustSchema), async (req, res) => {
  try {
    const { id } = req.params
    const { points, note } = req.body as z.infer<typeof adjustSchema>

    const result = await prisma.$transaction(async (tx) => {
      if (points < 0) {
        // Même garde-fou atomique que /redeem — un débit ne peut jamais faire
        // passer le solde sous 0, y compris en cas d'appels concurrents.
        const updated = await tx.user.updateMany({
          where: { id, loyaltyPoints: { gte: -points } },
          data:  { loyaltyPoints: { decrement: -points } },
        })
        if (updated.count === 0) return null
      } else {
        const updated = await tx.user.updateMany({
          where: { id },
          data:  { loyaltyPoints: { increment: points } },
        })
        if (updated.count === 0) return null
      }

      await tx.pointTransaction.create({
        data: { userId: id, type: 'adjustment', points, note },
      })
      return tx.user.findUnique({ where: { id }, select: { loyaltyPoints: true } })
    })

    if (!result) {
      res.status(400).json({ success: false, message: 'Ajustement refusé — solde insuffisant ou utilisateur introuvable' })
      return
    }

    logAdminAction(req, {
      action: 'loyalty.adjust',
      targetType: 'User',
      targetId: id,
      metadata: { points, note, newBalance: result.loyaltyPoints },
    })

    res.json({ success: true, data: { loyaltyPoints: result.loyaltyPoints } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
