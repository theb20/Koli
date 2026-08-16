import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, validateQuery, zIntIdParam } from '../middleware/validate'
import { cacheControl } from '../middleware/cache'
import { memoryCache } from '../middleware/memoryCache'
import { deleteLocalUpload } from '../lib/deleteLocalUpload'
import { uploadToStockgo, deleteFromStockgo } from '../lib/stockgo'
import { toWebp } from '../lib/imageProcessing'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'
import { scanBuffer } from '../lib/virusScan'

/* ── Multer — même schéma que categories.ts : buffer mémoire, converti en WebP puis envoyé à stockgo ── */
const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 Mo max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'))
  },
})

function handleBannerImageUpload(req: Request, res: Response, next: NextFunction) {
  bannerUpload.single('image')(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Image trop volumineuse (5 Mo maximum)' })
      return
    }
    const message = err instanceof Error ? err.message : 'Fichier invalide'
    res.status(400).json({ success: false, message })
  })
}

const router = Router()

/* ── Schema ──────────────────────────────────────────────────── */

const bannerSchema = z.object({
  slot:     z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slot: lettres minuscules, chiffres et tirets uniquement'),
  title:    z.string().min(2).max(80),
  href:     z.string().min(1).max(300),
  ctaLabel: z.string().min(1).max(40).optional(),
  image:    z.string().url().optional().or(z.literal('')),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const slotQuerySchema = z.object({ slot: z.string().min(1).max(60) })

/* ─────────────────────────────────────────────────────────────
   GET /api/promo-banners?slot=X — public, bannières actives d'un
   emplacement, triées. Utilisé par le storefront pour afficher les
   rectangles publicitaires (ex: encadrant "Meilleures ventes").
───────────────────────────────────────────────────────────── */
// TTL volontairement court (contrairement aux 300s de /api/categories) — un
// admin qui change une bannière s'attend à la voir changer sur le site
// "à tout moment", pas 5 minutes plus tard.
router.get('/', validateQuery(slotQuerySchema), cacheControl(15), memoryCache(15), async (req, res) => {
  try {
    const { slot } = req.query as unknown as z.infer<typeof slotQuerySchema>
    const banners = await prisma.promoBanner.findMany({
      where: { slot, isActive: true },
      orderBy: { position: 'asc' },
    })
    res.json({ success: true, data: banners })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/promo-banners/admin — toutes les bannières, tous slots [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin', requireAdmin, async (_req, res) => {
  try {
    const banners = await prisma.promoBanner.findMany({
      orderBy: [{ slot: 'asc' }, { position: 'asc' }],
    })
    res.json({ success: true, data: banners })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/promo-banners [ADMIN] — créer (sans image, ajoutée ensuite
   via /:id/image comme pour les catégories)
───────────────────────────────────────────────────────────── */
router.post('/', requireAdmin, validate(bannerSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof bannerSchema>

    if (body.position === undefined) {
      const last = await prisma.promoBanner.findFirst({ where: { slot: body.slot }, orderBy: { position: 'desc' } })
      body.position = (last?.position ?? -1) + 1
    }

    const banner = await prisma.promoBanner.create({
      data: { ...body, image: body.image || '' } as Parameters<typeof prisma.promoBanner.create>[0]['data'],
    })
    logAdminAction(req, { action: 'promoBanner.create', targetType: 'PromoBanner', targetId: String(banner.id) })
    res.status(201).json({ success: true, data: banner })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la création' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/promo-banners/:id [ADMIN] — mettre à jour
───────────────────────────────────────────────────────────── */
router.put('/:id', requireAdmin, validateParams(zIntIdParam), validate(bannerSchema.partial()), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const body = req.body as Partial<z.infer<typeof bannerSchema>>

    const banner = await prisma.promoBanner.update({
      where: { id },
      data: body as Parameters<typeof prisma.promoBanner.update>[0]['data'],
    })
    logAdminAction(req, { action: 'promoBanner.update', targetType: 'PromoBanner', targetId: String(id) })
    res.json({ success: true, data: banner })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PATCH /api/promo-banners/:id/toggle [ADMIN] — activer / désactiver
───────────────────────────────────────────────────────────── */
router.patch('/:id/toggle', requireAdmin, validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const banner = await prisma.promoBanner.findUnique({ where: { id } })
    if (!banner) { res.status(404).json({ success: false, message: 'Bannière introuvable' }); return }

    const updated = await prisma.promoBanner.update({ where: { id }, data: { isActive: !banner.isActive } })
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/promo-banners/:id [ADMIN]
───────────────────────────────────────────────────────────── */
router.delete('/:id', requireAdmin, validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params['id'])

    const banner = await prisma.promoBanner.findUnique({ where: { id }, select: { image: true } })
    await prisma.promoBanner.delete({ where: { id } })
    if (banner?.image) {
      deleteLocalUpload(banner.image)
      await deleteFromStockgo(banner.image)
    }

    logAdminAction(req, { action: 'promoBanner.delete', targetType: 'PromoBanner', targetId: String(id) })
    res.json({ success: true, message: 'Bannière supprimée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/promo-banners/:id/image [ADMIN] — uploader l'image
───────────────────────────────────────────────────────────── */
router.post('/:id/image', requireAdmin, validateParams(zIntIdParam), handleBannerImageUpload, async (req, res) => {
  try {
    const id = Number(req.params['id'])
    if (!req.file) { res.status(400).json({ success: false, message: 'Aucun fichier reçu' }); return }

    const scan = await scanBuffer(req.file.buffer, req.file.originalname)
    if (!scan.clean) {
      res.status(400).json({ success: false, message: `Fichier refusé — contenu malveillant détecté (${scan.reason})` })
      return
    }

    const webp = await toWebp(req.file.buffer)
    const filename = `banner-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
    const imageUrl = await uploadToStockgo(webp, filename, 'image/webp', 'promo-banners')

    const banner = await prisma.promoBanner.findUnique({ where: { id } })
    if (banner?.image) {
      deleteLocalUpload(banner.image)
      await deleteFromStockgo(banner.image)
    }

    const updated = await prisma.promoBanner.update({ where: { id }, data: { image: imageUrl } })
    res.json({ success: true, data: updated })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'upload" })
  }
})

export default router
