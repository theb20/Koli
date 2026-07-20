import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { cacheControl } from '../middleware/cache'
import { getBackendUrl } from '../lib/backendUrl'
import { deleteLocalUpload } from '../lib/deleteLocalUpload'
import { toWebp } from '../lib/imageProcessing'

/* ── Multer — buffer en mémoire, converti en WebP avant écriture ── */
const catUploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads', 'cat')
if (!fs.existsSync(catUploadDir)) fs.mkdirSync(catUploadDir, { recursive: true })

const catUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'))
  },
})

/** Cf. product-requests.ts — évite qu'une erreur multer ressorte en 500 générique */
function handleCatImageUpload(req: Request, res: Response, next: NextFunction) {
  catUpload.single('image')(req, res, (err: unknown) => {
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

const categorySchema = z.object({
  slug:        z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug: lettres minuscules, chiffres et tirets uniquement'),
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  icon:        z.string().max(10).optional(),
  image:       z.string().url().optional().or(z.literal('')),
  tag:         z.string().max(30).optional(),
  position:    z.number().int().min(0).optional(),
  isActive:    z.boolean().optional(),
})

/* ─────────────────────────────────────────────────────────────
   GET /api/categories — public, catégories actives triées
───────────────────────────────────────────────────────────── */
router.get('/', cacheControl(300), async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    })
    res.json({ success: true, data: categories })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/categories/admin — toutes les catégories [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin', requireAdmin, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { position: 'asc' },
    })
    res.json({ success: true, data: categories })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/categories [ADMIN] — créer
───────────────────────────────────────────────────────────── */
router.post('/', requireAdmin, validate(categorySchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof categorySchema>

    // Auto-position à la fin si non fourni
    if (body.position === undefined) {
      const last = await prisma.category.findFirst({ orderBy: { position: 'desc' } })
      body.position = (last?.position ?? -1) + 1
    }

    const existing = await prisma.category.findUnique({ where: { slug: body.slug } })
    if (existing) {
      res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé' })
      return
    }

    const category = await prisma.category.create({ data: body as Parameters<typeof prisma.category.create>[0]['data'] })
    res.status(201).json({ success: true, data: category })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la création' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/categories/:id [ADMIN] — mettre à jour
───────────────────────────────────────────────────────────── */
router.put('/:id', requireAdmin, validate(categorySchema.partial()), async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '0')
    if (!id) { res.status(400).json({ success: false, message: 'ID invalide' }); return }

    const body = req.body as Partial<z.infer<typeof categorySchema>>

    // Vérifier unicité du slug si changé
    if (body.slug) {
      const existing = await prisma.category.findFirst({ where: { slug: body.slug, NOT: { id } } })
      if (existing) {
        res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé' })
        return
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: body as Parameters<typeof prisma.category.update>[0]['data'],
    })
    res.json({ success: true, data: category })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PATCH /api/categories/:id/toggle [ADMIN] — activer / désactiver
───────────────────────────────────────────────────────────── */
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '0')
    if (!id) { res.status(400).json({ success: false, message: 'ID invalide' }); return }

    const cat = await prisma.category.findUnique({ where: { id } })
    if (!cat) { res.status(404).json({ success: false, message: 'Catégorie introuvable' }); return }

    const updated = await prisma.category.update({ where: { id }, data: { isActive: !cat.isActive } })
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PATCH /api/categories/reorder [ADMIN] — réordonner
   Body: { order: number[] }  (tableau d'IDs dans l'ordre voulu)
───────────────────────────────────────────────────────────── */
router.patch('/reorder', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ order: z.array(z.number().int().positive()).min(1) })
    const { order } = schema.parse(req.body)

    await Promise.all(
      order.map((id, idx) => prisma.category.update({ where: { id }, data: { position: idx } }))
    )

    res.json({ success: true, message: 'Ordre mis à jour' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/categories/:id [ADMIN] — supprimer
───────────────────────────────────────────────────────────── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '0')
    if (!id) { res.status(400).json({ success: false, message: 'ID invalide' }); return }

    const cat = await prisma.category.findUnique({ where: { id }, select: { image: true } })
    await prisma.category.delete({ where: { id } })
    if (cat?.image) deleteLocalUpload(cat.image)

    res.json({ success: true, message: 'Catégorie supprimée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/categories/:id/image [ADMIN] — uploader une image
   Stocke dans uploads/cat/ et met à jour le champ image
───────────────────────────────────────────────────────────── */
router.post('/:id/image', requireAdmin, handleCatImageUpload, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '0')
    if (!id) { res.status(400).json({ success: false, message: 'ID invalide' }); return }
    if (!req.file) { res.status(400).json({ success: false, message: 'Aucun fichier reçu' }); return }

    const webp = await toWebp(req.file.buffer)
    const filename = `cat-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
    fs.writeFileSync(path.join(catUploadDir, filename), webp)

    const BASE_URL = getBackendUrl()
    const imageUrl = `${BASE_URL}/uploads/cat/${filename}`

    // Supprimer l'ancienne image si c'est un fichier local
    const cat = await prisma.category.findUnique({ where: { id } })
    if (cat?.image) deleteLocalUpload(cat.image)

    const updated = await prisma.category.update({
      where: { id },
      data: { image: imageUrl },
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'upload" })
  }
})

export default router
