/* ─────────────────────────────────────────────────────────────
   Messagerie privée boutique ↔ équipe Skignas — un seul fil par boutique,
   jamais une conversation par admin : n'importe quel admin peut répondre,
   voir routes/seller.ts (côté marchand) pour le pendant de ce fichier.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validateParams, zIntIdParam } from '../middleware/validate'
import { logger } from '../lib/logger'
import { toWebp } from '../lib/imageProcessing'
import { scanBuffer } from '../lib/virusScan'
import { uploadToStockgo } from '../lib/stockgo'
import { sendNewAdminMessageEmail } from '../lib/mailer'

const router = Router()

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image (jpg, png, webp, heic, avif) sont acceptés'))
  },
})
function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  imageUpload.single('file')(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Fichier trop volumineux (8 Mo maximum)' })
      return
    }
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Fichier invalide' })
  })
}

// AVANT /:id — sinon "upload-image" serait pris pour une valeur de :id.
router.post('/upload-image', requireAdmin, handleImageUpload, async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: "Champ 'file' manquant" }); return }

    const scan = await scanBuffer(req.file.buffer, req.file.originalname)
    if (!scan.clean) {
      res.status(400).json({ success: false, message: 'Fichier rejeté par le scan antivirus' })
      return
    }

    const webp = await toWebp(req.file.buffer)
    const url = await uploadToStockgo(webp, `msg-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`, 'image/webp', 'messages')

    res.status(201).json({ success: true, data: { url } })
  } catch (err) {
    logger.error('[admin/messages upload-image] échec', err)
    res.status(500).json({ success: false, message: "Échec de l'upload" })
  }
})

/* GET /api/admin/messages — une ligne par boutique ayant au moins un
   message, triée par dernière activité, avec compteur de non-lus côté
   admin (readByAdminAt null sur un message envoyé par le marchand). */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const stores = await prisma.sellerStore.findMany({
      where: { messages: { some: {} } },
      select: {
        id: true, name: true, logo: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { senderRole: 'merchant', readByAdminAt: null } } } },
      },
    })

    const shaped = stores
      .map(s => ({
        storeId: s.id,
        storeName: s.name,
        storeLogo: s.logo,
        lastMessage: s.messages[0] ?? null,
        unreadCount: s._count.messages,
      }))
      .sort((a, b) => (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0))

    res.json({ success: true, data: { conversations: shaped } })
  } catch (err) {
    logger.error('[admin/messages list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/admin/messages/:id — :id est un storeId */
router.get('/:id', requireAdmin, validateParams(zIntIdParam), async (req, res) => {
  try {
    const storeId = Number(req.params['id'])
    const store = await prisma.sellerStore.findUnique({ where: { id: storeId }, select: { id: true, name: true } })
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const messages = await prisma.merchantMessage.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    })

    await prisma.merchantMessage.updateMany({
      where: { storeId, senderRole: 'merchant', readByAdminAt: null },
      data: { readByAdminAt: new Date() },
    })

    res.json({ success: true, data: { store, messages } })
  } catch (err) {
    logger.error('[admin/messages detail]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const sendMessageSchema = z.object({
  body:          z.string().trim().min(1).max(4000),
  attachmentUrl: z.string().url().optional(),
})

/* POST /api/admin/messages/:id — :id est un storeId */
router.post('/:id', requireAdmin, validateParams(zIntIdParam), async (req, res) => {
  try {
    const storeId = Number(req.params['id'])
    const store = await prisma.sellerStore.findUnique({ where: { id: storeId }, select: { id: true, userId: true, name: true, user: { select: { email: true } } } })
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const body = sendMessageSchema.parse(req.body)

    const message = await prisma.merchantMessage.create({
      data: {
        storeId,
        senderRole: 'admin',
        senderId: req.user!.userId,
        body: body.body,
        attachmentUrl: body.attachmentUrl,
        readByAdminAt: new Date(),
      },
    })

    await prisma.notification.create({
      data: {
        userId: store.userId,
        type:   'message',
        title:  "Nouveau message de l'équipe Skignas",
        body:   body.body.slice(0, 140),
        link:   '/messages',
      },
    })
    sendNewAdminMessageEmail(store.user.email, { body: body.body }).catch(() => {})

    res.status(201).json({ success: true, data: message })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Message invalide' }); return }
    logger.error('[admin/messages send]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
