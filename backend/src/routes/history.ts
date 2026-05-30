import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

/* POST /api/history — enregistrer une vue produit */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { productId } = z.object({ productId: z.number().int().positive() }).parse(req.body)

    await prisma.browseHistory.upsert({
      where:  { userId_productId: { userId: req.user!.userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId: req.user!.userId, productId },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/history — mes produits récemment consultés */
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await prisma.browseHistory.findMany({
      where:   { userId: req.user!.userId },
      orderBy: { viewedAt: 'desc' },
      take:    12,
      include: {
        product: {
          include: { images: { take: 1, orderBy: { position: 'asc' } } },
        },
      },
    })
    const products = items
      .filter(i => i.product.isActive)
      .map(i => i.product)
    res.json({ success: true, data: { products } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* DELETE /api/history — vider l'historique */
router.delete('/', requireAuth, async (req, res) => {
  try {
    await prisma.browseHistory.deleteMany({ where: { userId: req.user!.userId } })
    res.json({ success: true, message: 'Historique effacé.' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
