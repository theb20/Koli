import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { cacheControl } from '../middleware/cache'
import { memoryCache } from '../middleware/memoryCache'

const router = Router()

/* GET /api/flash — produits en vente flash actives */
router.get('/', cacheControl(20), memoryCache(20), async (_req, res) => {
  try {
    const now = new Date()
    const products = await prisma.product.findMany({
      where: {
        isActive:   true,
        saleEndsAt: { gt: now },
        salePrice:  { not: null },
        OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: now } }],
      },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
      orderBy: { saleEndsAt: 'asc' },
    })
    res.json({ success: true, data: { products } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
