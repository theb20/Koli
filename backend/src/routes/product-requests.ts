import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { validate, validateParams, validateQuery, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { sendNewProductRequestAdminEmail, sendProductRequestReplyEmail } from '../lib/mailer'
import { uploadToStockgo } from '../lib/stockgo'
import { toWebp } from '../lib/imageProcessing'
import { logger } from '../lib/logger'
import { scanFiles } from '../lib/virusScan'

const router = Router()

// Même format que orders.ts (KLI-YYYYMMDD-NNNN) — dupliqué plutôt que partagé,
// cohérent avec le reste de la base (ex: parseSpecsColumn dans products.ts/seller.ts).
function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `KLI-${date}-${rand}`
}

/* ── Multer — buffer en mémoire, converti en WebP puis envoyé à stockgo ── */
const reqUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    // heic/heif = format par défaut des photos iPhone — sans ça, l'upload
    // échoue silencieusement (500 générique) pour une bonne partie des mobiles.
    if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'))
  },
})

/**
 * Enveloppe reqUpload pour intercepter les erreurs multer (type de fichier
 * refusé, taille dépassée, trop de fichiers) et répondre avec un message
 * clair en 400 — sans ce wrapper, ces erreurs tombent dans le handler
 * d'erreur générique de l'app et ressortent en 500 "Erreur interne du
 * serveur", ce qui rend l'échec impossible à diagnostiquer côté client.
 */
function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  reqUpload.array('images', 4)(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, message: 'Image trop volumineuse (5 Mo maximum)' })
        return
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ success: false, message: '4 images maximum' })
        return
      }
    }
    const message = err instanceof Error ? err.message : 'Fichier invalide'
    res.status(400).json({ success: false, message })
  })
}

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
router.post('/upload-images', handleImageUpload, async (req, res) => {
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
      const filename = `req-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
      return await uploadToStockgo(webp, filename, 'image/webp', 'requests')
    }))
    res.json({ success: true, data: { urls } })
  } catch (err) {
    logger.error(err)
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
        logger.error('[product-requests] échec notification admin', err) // non bloquant
      }
    })()

    res.status(201).json({
      success: true,
      message: 'Demande envoyée ! Notre équipe vous répondra sous 24-48h.',
      data: { id: request.id },
    })
  } catch (err) {
    logger.error(err)
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
const reqListQuerySchema = zPaginationQuery.extend({ status: z.string().max(20).optional() })

router.get('/admin/all', requireAdmin, validateQuery(reqListQuerySchema), async (req, res) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof reqListQuerySchema>

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
router.get('/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
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

   Passage à "fulfilled" : génère une vraie commande (Order + OrderItem)
   à partir de la demande, pour qu'elle soit trackable au même titre qu'un
   achat classique (« Mes commandes » du client, liste admin, retours...).
   OrderItem exige toujours un produit réel — un Product masqué du catalogue
   (isActive: false) est donc créé pour porter la ligne. Idempotent : si la
   demande a déjà une commande liée (orderId), on ne recrée rien.
───────────────────────────────────────────────────────────── */
router.patch('/:id/status', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['new', 'processing', 'quoted', 'fulfilled', 'rejected', 'cancelled']),
    }).parse(req.body)

    const existing = await prisma.productRequest.findUnique({ where: { id: req.params['id']! } })
    if (!existing) {
      res.status(404).json({ success: false, message: 'Demande introuvable' })
      return
    }

    if (status === 'fulfilled' && !existing.orderId) {
      const unitPrice = existing.quotedPrice ?? existing.budget
      if (!unitPrice) {
        res.status(400).json({
          success: false,
          message: "Aucun prix n'a été communiqué au client — envoyez un devis (prix) avant de marquer la demande comme traitée.",
        })
        return
      }

      const quantity = existing.quantity ?? 1
      const subtotal = unitPrice * quantity
      const defaultTax = await prisma.taxRate.findFirst({ where: { isDefault: true, isActive: true } })
      const taxRatePercent = defaultTax?.rate ?? 0
      const taxAmount = Math.round(subtotal * taxRatePercent / 100)
      const images = existing.images ? (JSON.parse(existing.images) as string[]) : []
      const orderNumber = generateOrderNumber()

      const order = await prisma.$transaction(async (tx) => {
        // Produit masqué — n'apparaît jamais dans le catalogue public, existe
        // uniquement pour satisfaire la contrainte OrderItem.productId.
        const sourcedProduct = await tx.product.create({
          data: {
            name:        existing.productName,
            brand:       'Sourcing Skignas',
            category:    'sourcing',
            price:       unitPrice,
            stock:       0,
            isActive:    false,
            description: existing.description,
            images: images.length ? { create: images.map((url, i) => ({ url, position: i })) } : undefined,
          },
        })

        const created = await tx.order.create({
          data: {
            orderNumber,
            userId:          existing.userId,
            clientPrenom:    existing.clientPrenom,
            clientNom:       existing.clientNom,
            clientEmail:     existing.clientEmail,
            clientTelephone: existing.clientTelephone ?? '',
            deliveryMethod:  'standard',
            shippingAddress: JSON.stringify({ ville: existing.deliveryAddress, adresse: '' }),
            shippingCost:    0,
            paymentMethod:   'cash',
            paymentStatus:   'paid',
            subtotal,
            taxRate:         taxRatePercent,
            taxAmount,
            total:           subtotal + taxAmount,
            status:          'delivered',
            deliveredAt:     new Date(),
            notes:           `Générée depuis la demande de sourcing ${existing.id}`,
            items: {
              create: [{
                productId: sourcedProduct.id,
                name:      existing.productName,
                brand:     'Sourcing Skignas',
                price:     unitPrice,
                qty:       quantity,
                image:     images[0] ?? '',
              }],
            },
          },
        })

        await tx.productRequest.update({ where: { id: existing.id }, data: { status, orderId: created.id } })
        return created
      })

      if (existing.userId) {
        await prisma.notification.create({
          data: {
            userId: existing.userId,
            type:   'order',
            title:  'Votre demande de sourcing est devenue une commande',
            body:   `« ${existing.productName} » a été trouvé — commande ${order.orderNumber} en cours de livraison.`,
            link:   `/commandes/${order.orderNumber}`,
          },
        }).catch(() => {})
      }

      res.json({ success: true, data: { request: { ...existing, status, orderId: order.id }, order } })
      return
    }

    const request = await prisma.productRequest.update({ where: { id: req.params['id']! }, data: { status } })
    res.json({ success: true, data: { request } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Statut invalide' })
      return
    }
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Demande introuvable' })
      return
    }
    logger.error('[PATCH product-request status]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests/:id/reply  [ADMIN]
   Envoie une réponse personnalisée directement dans la boîte mail du client.
───────────────────────────────────────────────────────────── */
router.post('/:id/reply', requireAdmin, validateParams(zCuidIdParam), validate(replySchema), async (req, res) => {
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
    logger.error(err)
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la réponse" })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/product-requests/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.delete('/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.productRequest.delete({ where: { id: req.params['id']! } })
    res.json({ success: true, message: 'Demande supprimée' })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      // Déjà supprimée (double-clic, liste obsolète côté client) — pas une vraie erreur serveur.
      res.status(404).json({ success: false, message: 'Demande déjà supprimée' })
      return
    }
    logger.error('[DELETE product-request]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
