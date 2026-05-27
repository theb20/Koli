import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating:    z.number().int().min(1).max(5),
  title:     z.string().max(100).optional(),
  body:      z.string().min(10, 'Minimum 10 caractères').max(2000),
})

/* ── GET /api/reviews/product/:id ─────────────────────────── */
router.get('/product/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params['id'] ?? '')
    const page  = parseInt(req.query['page'] as string) || 1
    const limit = parseInt(req.query['limit'] as string) || 10

    const [total, reviews, stats] = await Promise.all([
      prisma.review.count({ where: { productId } }),
      prisma.review.findMany({
        where:   { productId },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          user: { select: { prenom: true, nom: true, avatar: true } },
        },
      }),
      // Statistiques de notation
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      }),
    ])

    const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
      stars: r,
      count: stats.find(s => s.rating === r)?._count.rating ?? 0,
    }))

    const avgRating = total > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / total
      : 0

    res.json({
      success: true,
      data: {
        reviews,
        stats: { total, avgRating: Math.round(avgRating * 10) / 10, ratingDistribution },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/reviews ─────────────────────────────────────── */
router.post('/', requireAuth, validate(reviewSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof reviewSchema>
    const userId = req.user!.userId

    // Vérifier si déjà un avis
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId: data.productId } },
    })
    if (existing) {
      res.status(409).json({ success: false, message: 'Vous avez déjà laissé un avis pour ce produit' })
      return
    }

    // Vérifier si achat vérifié
    const hasBought = await prisma.orderItem.findFirst({
      where: { productId: data.productId, order: { userId, status: 'delivered' } },
    })

    const review = await prisma.review.create({
      data: { ...data, userId, verified: !!hasBought },
      include: { user: { select: { prenom: true, nom: true, avatar: true } } },
    })

    // Recalculer la note moyenne du produit
    const agg = await prisma.review.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: { rating: true },
    })
    await prisma.product.update({
      where: { id: data.productId },
      data: {
        rating:  Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviews: agg._count.rating,
      },
    })

    res.status(201).json({ success: true, data: review })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/reviews/:id — Modifier son avis ──────────────── */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      rating: z.number().int().min(1).max(5).optional(),
      title:  z.string().max(100).optional(),
      body:   z.string().min(10).max(2000).optional(),
    })
    const data = schema.parse(req.body)

    const review = await prisma.review.findFirst({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    if (!review) {
      res.status(404).json({ success: false, message: 'Avis introuvable' })
      return
    }

    const updated = await prisma.review.update({ where: { id: review.id }, data })
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/reviews/:id ───────────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    if (!review) {
      res.status(404).json({ success: false, message: 'Avis introuvable' })
      return
    }

    await prisma.review.delete({ where: { id: review.id } })

    // Recalculer la note
    const agg = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true }, _count: { rating: true },
    })
    await prisma.product.update({
      where: { id: review.productId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviews: agg._count.rating },
    })

    res.json({ success: true, message: 'Avis supprimé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/reviews/:id/helpful ────────────────────────── */
router.post('/:id/helpful', async (req, res) => {
  try {
    await prisma.review.update({
      where: { id: req.params['id'] },
      data:  { helpful: { increment: 1 } },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
