import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

/* GET /api/seller/me — infos de ma boutique */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const store = await prisma.sellerStore.findUnique({
      where:   { userId: req.user!.userId },
      include: {
        products: {
          include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
        },
      },
    })
    res.json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/seller/register — créer ma boutique */
router.post('/register', requireAuth, async (req, res) => {
  try {
    const body = z.object({
      name:        z.string().min(2).max(80),
      description: z.string().max(500).optional(),
      phone:       z.string().optional(),
      address:     z.string().optional(),
    }).parse(req.body)

    const existing = await prisma.sellerStore.findUnique({ where: { userId: req.user!.userId } })
    if (existing) {
      res.status(409).json({ success: false, message: 'Vous avez déjà une boutique.' })
      return
    }

    const store = await prisma.sellerStore.create({
      data: { userId: req.user!.userId, ...body },
    })
    // Passer le rôle en "seller"
    await prisma.user.update({
      where: { id: req.user!.userId },
      data:  { role: 'seller' },
    })
    res.status(201).json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* PATCH /api/seller/me — mettre à jour ma boutique */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const body = z.object({
      name:        z.string().min(2).max(80).optional(),
      description: z.string().max(500).optional(),
      logo:        z.string().optional(),
      banner:      z.string().optional(),
      phone:       z.string().optional(),
      address:     z.string().optional(),
    }).parse(req.body)

    const store = await prisma.sellerStore.update({
      where: { userId: req.user!.userId },
      data:  body,
    })
    res.json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/seller/stats — revenus + commandes */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const store = await prisma.sellerStore.findUnique({ where: { userId: req.user!.userId } })
    if (!store) {
      res.status(404).json({ success: false, message: 'Boutique introuvable.' })
      return
    }
    const sellerProducts = await prisma.sellerProduct.findMany({
      where:  { storeId: store.id },
      select: { productId: true, commission: true },
    })
    const productIds = sellerProducts.map(p => p.productId)

    const orderItems = await prisma.orderItem.findMany({
      where:   { productId: { in: productIds } },
      include: { order: { select: { status: true, createdAt: true } } },
    })

    const revenue = orderItems
      .filter(i => i.order.status === 'delivered')
      .reduce((s, i) => {
        const sp = sellerProducts.find(p => p.productId === i.productId)
        const commission = sp?.commission ?? 5
        return s + i.price * i.qty * (1 - commission / 100)
      }, 0)

    const totalOrders = new Set(orderItems.map(i => i.orderId)).size

    res.json({
      success: true,
      data: {
        revenue,
        totalOrders,
        totalProducts: productIds.length,
        isApproved: store.isApproved,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
