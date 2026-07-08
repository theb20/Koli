import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendNewProductRequestAdminEmail, sendProductRequestReplyEmail } from '../lib/mailer'

const router = Router()

/* ── Multer — stockage dans uploads/requests/ ──────────────────── */
const reqUploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads', 'requests')
if (!fs.existsSync(reqUploadDir)) fs.mkdirSync(reqUploadDir, { recursive: true })

const reqStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reqUploadDir),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg'
    const name = `req-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  },
})
const reqUpload = multer({
  storage: reqStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp)'))
  },
})

/* ── Schemas ─────────────────────────────────────────────────── */
const createSchema = z.object({
  clientPrenom:    z.string().min(2),
  clientNom:       z.string().min(2),
  clientEmail:     z.string().email(),
  clientTelephone: z.string().optional(),
  productName:     z.string().min(2).max(200),
  description:     z.string().min(10).max(2000),
  images:          z.array(z.string().url()).max(4).optional(),
  quantity:        z.coerce.number().int().positive().optional(),
  budget:          z.coerce.number().int().positive().optional(),
  deliveryAddress: z.string().min(5),
  desiredDate:     z.coerce.date().optional(),
})

const replySchema = z.object({
  message:     z.string().min(5).max(3000),
  quotedPrice: z.coerce.number().int().positive().optional(),
})

/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests/upload-images — images de la demande
───────────────────────────────────────────────────────────── */
router.post('/upload-images', reqUpload.array('images', 4), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) {
      res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
      return
    }
    const BASE_URL = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 4000}`
    const urls = files.map(f => `${BASE_URL}/uploads/requests/${f.filename}`)
    res.json({ success: true, data: { urls } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'upload" })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests — Nouvelle demande de sourcing
───────────────────────────────────────────────────────────── */
router.post('/', optionalAuth, validate(createSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof createSchema>

    const request = await prisma.productRequest.create({
      data: {
        userId:          req.user?.userId ?? null,
        clientPrenom:    body.clientPrenom,
        clientNom:       body.clientNom,
        clientEmail:     body.clientEmail,
        clientTelephone: body.clientTelephone,
        productName:     body.productName,
        description:     body.description,
        images:          body.images?.length ? JSON.stringify(body.images) : null,
        quantity:        body.quantity,
        budget:          body.budget,
        deliveryAddress: body.deliveryAddress,
        desiredDate:     body.desiredDate,
      },
    })

    // Notifier les administrateurs — bulle in-app + email(s) configurés dans les paramètres.
    // Ne bloque jamais la réponse au client si ça échoue.
    ;(async () => {
      try {
        const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map(a => ({
              userId: a.id,
              type:   'order',
              title:  'Nouvelle demande de sourcing',
              body:   `${body.clientPrenom} ${body.clientNom} recherche "${body.productName}"`,
              link:   `/product-requests/${request.id}`,
            })),
          })
        }

        const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { orderNotifyEmails: true } })
        const recipients = (settings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean)
        await Promise.allSettled(recipients.map(email => sendNewProductRequestAdminEmail(email, {
          id:              request.id,
          productName:     body.productName,
          description:     body.description,
          clientNom:       `${body.clientPrenom} ${body.clientNom}`,
          clientEmail:     body.clientEmail,
          clientTelephone: body.clientTelephone,
          quantity:        body.quantity,
          budget:          body.budget,
          deliveryAddress: body.deliveryAddress,
        })))
      } catch (err) {
        console.error('[product-requests] échec notification admin', err) // non bloquant
      }
    })()

    res.status(201).json({
      success: true,
      message: 'Demande envoyée ! Notre équipe vous répondra sous 24-48h.',
      data: { id: request.id },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la demande" })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/mine — mes demandes (client connecté)
───────────────────────────────────────────────────────────── */
router.get('/mine', optionalAuth, async (req, res) => {
  try {
    if (!req.user) { res.json({ success: true, data: { requests: [] } }); return }
    const requests = await prisma.productRequest.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: { requests: requests.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })) } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/admin/all  [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page   = parseInt(req.query['page'] as string) || 1
    const limit  = parseInt(req.query['limit'] as string) || 20
    const status = req.query['status'] as string | undefined

    const where = status ? { status } : {}
    const [total, requests] = await Promise.all([
      prisma.productRequest.count({ where }),
      prisma.productRequest.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
    ])

    res.json({
      success: true,
      data: {
        requests: requests.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const request = await prisma.productRequest.findUnique({ where: { id: req.params['id']! } })
    if (!request) {
      res.status(404).json({ success: false, message: 'Demande introuvable' })
      return
    }
    res.json({ success: true, data: { request: { ...request, images: request.images ? JSON.parse(request.images) : [] } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PATCH /api/product-requests/:id/status  [ADMIN]
───────────────────────────────────────────────────────────── */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['new', 'processing', 'quoted', 'fulfilled', 'rejected', 'cancelled']),
    }).parse(req.body)

    const request = await prisma.productRequest.update({ where: { id: req.params['id']! }, data: { status } })
    res.json({ success: true, data: { request } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests/:id/reply  [ADMIN]
   Envoie une réponse personnalisée directement dans la boîte mail du client.
───────────────────────────────────────────────────────────── */
router.post('/:id/reply', requireAdmin, validate(replySchema), async (req, res) => {
  try {
    const { message, quotedPrice } = req.body as z.infer<typeof replySchema>

    const request = await prisma.productRequest.findUnique({ where: { id: req.params['id']! } })
    if (!request) {
      res.status(404).json({ success: false, message: 'Demande introuvable' })
      return
    }

    await sendProductRequestReplyEmail(request.clientEmail, request.clientPrenom, request.productName, message, quotedPrice)

    const updated = await prisma.productRequest.update({
      where: { id: request.id },
      data: {
        adminReply:  message,
        quotedPrice: quotedPrice ?? request.quotedPrice,
        status:      request.status === 'new' ? 'quoted' : request.status,
        repliedAt:   new Date(),
      },
    })

    // Notification in-app si le client a un compte
    if (request.userId) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type:   'info',
          title:  'Réponse à votre demande de sourcing',
          body:   `Nous avons répondu à votre demande concernant "${request.productName}"`,
        },
      }).catch(() => {})
    }

    res.json({ success: true, message: 'Réponse envoyée au client', data: { request: updated } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la réponse" })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/product-requests/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.productRequest.delete({ where: { id: req.params['id']! } })
    res.json({ success: true, message: 'Demande supprimée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
