import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// 1 FCFA dépensé = 1 point (used by order service when crediting points)
const _POINTS_PER_FCFA = 1
export { _POINTS_PER_FCFA as POINTS_PER_FCFA }
// Valeur d'un point en FCFA lors du remboursement
const POINT_VALUE_FCFA = 0.5
// Minimum points pour rembourser
const MIN_REDEEM_POINTS = 500

/* GET /api/loyalty/me — solde + historique */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { loyaltyPoints: true },
    })
    const transactions = await prisma.pointTransaction.findMany({
      where:   { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    })
    res.json({ success: true, data: { points: user?.loyaltyPoints ?? 0, transactions, pointValue: POINT_VALUE_FCFA } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/loyalty/redeem — utiliser des points (déduit lors de la commande) */
router.post('/redeem', requireAuth, async (req, res) => {
  try {
    const { points } = z.object({ points: z.number().int().positive() }).parse(req.body)
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { loyaltyPoints: true },
    })
    if (!user || user.loyaltyPoints < MIN_REDEEM_POINTS) {
      res.status(400).json({ success: false, message: `Il vous faut au moins ${MIN_REDEEM_POINTS} points pour utiliser vos récompenses.` })
      return
    }
    if (points > user.loyaltyPoints) {
      res.status(400).json({ success: false, message: 'Solde de points insuffisant.' })
      return
    }
    const discount = Math.floor(points * POINT_VALUE_FCFA)
    res.json({ success: true, data: { points, discount, remaining: user.loyaltyPoints - points } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
