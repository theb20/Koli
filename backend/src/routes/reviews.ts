import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { validate, validateParams, validateQuery, zIntIdParam, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { uploadToStockgo } from '../lib/stockgo'
import { toWebp } from '../lib/imageProcessing'
import { scanFiles } from '../lib/virusScan'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'

const router = Router()

/// Photos jointes à un avis — même contrat que product-requests : max 4,
/// 5 Mo par fichier, converties en WebP puis hébergées sur stockgo.
const MAX_REVIEW_IMAGES = 4
const zReviewImages = z.array(z.string().url()).max(MAX_REVIEW_IMAGES).optional()

/** `images` est stocké en JSON : renvoyé au client sous forme de tableau. */
function withParsedImages<T extends { images: string | null }>(review: T) {
  let images: string[] = []
  try { if (review.images) images = JSON.parse(review.images) as string[] } catch { /* ignore */ }
  return { ...review, images }
}

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating:    z.number().int().min(1).max(5),
  title:     z.string().max(100).optional(),
  body:      z.string().min(10, 'Minimum 10 caractères').max(2000),
  images:    zReviewImages,
})

const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_REVIEW_IMAGES },
  fileFilter: (_req, file, cb) => {
    // heic/heif : format par défaut des photos iPhone
    if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'))
  },
})

/** Renvoie les erreurs multer en 400 lisible plutôt qu'en 500 générique. */
function handleReviewImageUpload(req: Request, res: Response, next: NextFunction) {
  reviewUpload.array('images', MAX_REVIEW_IMAGES)(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, message: 'Image trop volumineuse (5 Mo maximum)' })
        return
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ success: false, message: `${MAX_REVIEW_IMAGES} images maximum` })
        return
      }
    }
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Fichier invalide' })
  })
}

/* ── POST /api/reviews/upload-images — photos jointes à un avis ── */
router.post('/upload-images', requireAuth, handleReviewImageUpload, async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) {
      res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
      return
    }

    const scan = await scanFiles(files)
    if (!scan.clean) {
      res.status(400).json({ success: false, message: `Fichier refusé — contenu malveillant détecté (${scan.reason})` })
      return
    }

    const urls = await Promise.all(files.map(async f => {
      const webp = await toWebp(f.buffer)
      const filename = `review-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
      return uploadToStockgo(webp, filename, 'image/webp', 'reviews')
    }))

    res.json({ success: true, data: { urls } })
  } catch (err) {
    logger.error('[reviews/upload-images]', err)
    res.status(500).json({ success: false, message: "Erreur lors de l'upload" })
  }
})

/* ── GET /api/reviews/latest  — derniers avis publics ─────── */
const latestReviewsQuerySchema = z.object({ limit: z.coerce.number().int().positive().max(20).optional().default(6) })

router.get('/latest', validateQuery(latestReviewsQuerySchema), async (req, res) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof latestReviewsQuerySchema>
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user:    { select: { prenom: true, nom: true, avatar: true } },
        product: { select: { name: true } },
      },
    })
    res.json({ success: true, data: { reviews: reviews.map(withParsedImages) } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   Avis sur la plateforme (page d'accueil) — sans produit associé,
   contrairement aux avis produit ci-dessus. Déclarées avant
   /product/:id et /:id pour ne pas être masquées par ces routes.
───────────────────────────────────────────────────────────── */
const siteReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body:   z.string().min(10, 'Minimum 10 caractères').max(2000),
  images: zReviewImages,
})

/* ── GET /api/reviews/site — derniers avis plateforme (public) ── */
router.get('/site', validateQuery(latestReviewsQuerySchema), async (req, res) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof latestReviewsQuerySchema>
    const reviews = await prisma.siteReview.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { prenom: true, nom: true, avatar: true } } },
    })
    res.json({ success: true, data: { reviews: reviews.map(withParsedImages) } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/reviews/site — publier un avis plateforme ────── */
router.post('/site', requireAuth, validate(siteReviewSchema), async (req, res) => {
  try {
    const { rating, body, images } = req.body as z.infer<typeof siteReviewSchema>
    const userId = req.user!.userId
    const imagesJson = images?.length ? JSON.stringify(images) : null

    // Un seul avis plateforme par compte : le second remplace le premier
    // (plutôt que d'empiler des doublons, la table n'ayant pas de contrainte).
    const existing = await prisma.siteReview.findFirst({ where: { userId } })
    const review = existing
      ? await prisma.siteReview.update({
          where: { id: existing.id },
          data:  { rating, body, images: imagesJson, createdAt: new Date() },
          include: { user: { select: { prenom: true, nom: true, avatar: true } } },
        })
      : await prisma.siteReview.create({
          data: { userId, rating, body, images: imagesJson },
          include: { user: { select: { prenom: true, nom: true, avatar: true } } },
        })

    res.status(201).json({ success: true, data: review })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/reviews/site/:id/helpful ─────────────────────
   Pendant de /:id/helpful pour les avis plateforme. Déclarée avant
   /:id/helpful, sinon "site" serait pris pour un identifiant d'avis. */
router.post('/site/:id/helpful', validateParams(zCuidIdParam), async (req, res) => {
  try {
    const updated = await prisma.siteReview.update({
      where: { id: req.params['id'] },
      data:  { helpful: { increment: 1 } },
    })
    res.json({ success: true, data: { helpful: updated.helpful } })
  } catch {
    res.status(404).json({ success: false, message: 'Avis introuvable' })
  }
})

/* ── GET /api/reviews/product/:id ─────────────────────────── */
router.get('/product/:id', validateParams(zIntIdParam), validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const productId = Number(req.params['id'])
    const { page, limit } = req.query as unknown as { page: number; limit: number }

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
/* Plusieurs avis autorisés par utilisateur par produit         */
router.post('/', requireAuth, validate(reviewSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof reviewSchema>
    const userId = req.user!.userId

    // Vérifier si achat vérifié
    const hasBought = await prisma.orderItem.findFirst({
      where: { productId: data.productId, order: { userId, status: 'delivered' } },
    })

    const { images, ...rest } = data
    const review = await prisma.review.create({
      data: { ...rest, images: images?.length ? JSON.stringify(images) : null, userId, verified: !!hasBought },
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
router.put('/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
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
router.delete('/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
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
router.post('/:id/helpful', validateParams(zCuidIdParam), async (req, res) => {
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

/* ── GET /api/reviews/admin/site  [ADMIN] ───────────────────
   Les avis plateforme vivent dans une table à part : sans cette route,
   ils resteraient invisibles depuis le backoffice alors qu'ils s'affichent
   en page d'accueil. */
router.get('/admin/site', requireAdmin, validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }
    const [total, reviews] = await Promise.all([
      prisma.siteReview.count(),
      prisma.siteReview.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { user: { select: { prenom: true, nom: true, email: true } } },
      }),
    ])
    res.json({
      success: true,
      data: { reviews: reviews.map(withParsedImages), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/reviews/admin/site/:id  [ADMIN] ───────────── */
router.delete('/admin/site/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.siteReview.delete({ where: { id: req.params['id'] } })
    logAdminAction(req, { action: 'review.site.delete', targetType: 'SiteReview', targetId: req.params['id']! })
    res.json({ success: true, message: 'Avis supprimé' })
  } catch {
    res.status(404).json({ success: false, message: 'Avis introuvable' })
  }
})

/* ── DELETE /api/reviews/admin/:id  [ADMIN] ─────────────────
   DELETE /:id est filtrée sur l'auteur ("supprimer mon avis") : un admin y
   recevait un 404 en tentant de modérer l'avis d'un client. Route dédiée,
   sans filtre d'auteur, qui recalcule la note du produit comme la version
   utilisateur. */
router.delete('/admin/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params['id'] } })
    if (!review) {
      res.status(404).json({ success: false, message: 'Avis introuvable' })
      return
    }

    await prisma.review.delete({ where: { id: review.id } })

    const agg = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true }, _count: { rating: true },
    })
    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating:  Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviews: agg._count.rating,
      },
    })

    logAdminAction(req, { action: 'review.delete', targetType: 'Review', targetId: review.id, metadata: { productId: review.productId } })
    res.json({ success: true, message: 'Avis supprimé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/reviews/admin/all  [ADMIN] ───────────────────── */
router.get('/admin/all', requireAdmin, validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }
    const [total, reviews] = await Promise.all([
      prisma.review.count(),
      prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: {
          product: { select: { name: true } },
          user:    { select: { prenom: true, nom: true } },
        },
      }),
    ])
    res.json({ success: true, data: { reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

export default router
