import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

/* ── GET /api/wishlist ──────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { images: { take: 1, orderBy: { position: 'asc' } } },
        },
      },
    })
    res.json({ success: true, data: items })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/wishlist/:productId — Ajouter ─────────────────── */
router.post('/:productId', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params['productId'] ?? '')
    if (isNaN(productId)) {
      res.status(400).json({ success: false, message: 'ID invalide' })
      return
    }

    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } })
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' })
      return
    }

    // upsert — pas d'erreur si déjà dans la wishlist
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user!.userId, productId } },
      create: { userId: req.user!.userId, productId },
      update: {},
    })

    res.status(201).json({ success: true, message: 'Ajouté aux favoris' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/wishlist/:productId — Supprimer ─────────────── */
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params['productId'] ?? '')
    if (isNaN(productId)) {
      res.status(400).json({ success: false, message: 'ID invalide' })
      return
    }

    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.userId, productId },
    })

    res.json({ success: true, message: 'Retiré des favoris' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/wishlist — Vider tout ─────────────────────── */
router.delete('/', requireAuth, async (req, res) => {
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user!.userId } })
    res.json({ success: true, message: 'Favoris vidés' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
