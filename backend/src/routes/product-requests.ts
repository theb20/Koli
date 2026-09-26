import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'node:crypto'
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
import { isMerchantgoConfigured, createWinipayerPayment, refreshWinipayerPayment } from '../lib/merchantgo'
import { applyOrderStatusChange } from './orders'
import { sendSms } from '../lib/sms/zavu'
import { normalizePhoneCI } from '../lib/phone'
import type { Prisma, ProductRequest } from '@prisma/client'

const router = Router()

// Même format que orders.ts (KLI-YYYYMMDD-NNNN) — dupliqué plutôt que partagé,
// cohérent avec le reste de la base (ex: parseSpecsColumn dans products.ts/seller.ts).
function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `KLI-${date}-${rand}`
}

/** Durée de validité d'un devis envoyé au client */
const QUOTE_VALIDITY_DAYS = 7

const frontendUrl = () => process.env.FRONTEND_URL ?? 'https://skignas.com'
const quoteUrl    = (token: string) => `${frontendUrl()}/devis/${token}`

/** Devis encore "quoted" dont la date de validité est passée. */
function isQuoteExpired(r: Pick<ProductRequest, 'status' | 'quoteExpiresAt'>): boolean {
  return r.status === 'quoted' && !!r.quoteExpiresAt && r.quoteExpiresAt.getTime() < Date.now()
}

/** Totaux d'un devis — même calcul (TVA par défaut) que la commande qui en découlera. */
async function quoteTotals(r: Pick<ProductRequest, 'quotedPrice' | 'quantity'>) {
  const unitPrice = r.quotedPrice ?? 0
  const quantity  = r.quantity ?? 1
  const subtotal  = unitPrice * quantity
  const defaultTax = await prisma.taxRate.findFirst({ where: { isDefault: true, isActive: true } })
  const taxRate   = defaultTax?.rate ?? 0
  const taxAmount = Math.round(subtotal * taxRate / 100)
  return { unitPrice, quantity, subtotal, taxRate, taxAmount, total: subtotal + taxAmount }
}

/** Notification in-app à tous les administrateurs (non bloquant). */
async function notifyAdmins(title: string, body: string, link: string) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(a => ({ userId: a.id, type: 'order', title, body, link })),
      })
    }
  } catch (err) {
    logger.error('[product-requests] échec notification admin', err)
  }
}

/**
 * Crée la commande d'un devis accepté — en attente de paiement en ligne,
 * jamais "payée" ici : seul le rappel merchantgo (mark-paid) le fait. Un
 * produit masqué du catalogue porte la ligne (OrderItem exige un produit).
 */
async function createSourcingOrder(tx: Prisma.TransactionClient, r: ProductRequest) {
  const { unitPrice, quantity, subtotal, taxRate, taxAmount, total } = await quoteTotals(r)
  const images = r.images ? (JSON.parse(r.images) as string[]) : []

  const sourcedProduct = await tx.product.create({
    data: {
      name:        r.productName,
      brand:       'Sourcing Skignas',
      category:    'sourcing',
      price:       unitPrice,
      stock:       0,
      isActive:    false,
      description: r.description,
      images: images.length ? { create: images.map((url, i) => ({ url, position: i })) } : undefined,
    },
  })

  return tx.order.create({
    data: {
      orderNumber:     generateOrderNumber(),
      userId:          r.userId,
      clientPrenom:    r.clientPrenom,
      clientNom:       r.clientNom,
      clientEmail:     r.clientEmail,
      clientTelephone: r.clientTelephone ?? '',
      deliveryMethod:  'standard',
      shippingAddress: JSON.stringify({ ville: r.deliveryAddress, adresse: '' }),
      shippingCost:    0,
      paymentMethod:   'online',
      paymentStatus:   'pending',
      status:          'pending',
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes:           `Devis de sourcing accepté par le client (demande ${r.id})`,
      items: {
        create: [{
          productId: sourcedProduct.id,
          name:      r.productName,
          brand:     'Sourcing Skignas',
          price:     unitPrice,
          qty:       quantity,
          image:     images[0] ?? '',
        }],
      },
    },
  })
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
      include: { order: { select: { orderNumber: true, status: true, paymentStatus: true, total: true } } },
    })
    res.json({ success: true, data: { requests: requests.map(r => ({
      ...r,
      images:  r.images ? JSON.parse(r.images) : [],
      expired: isQuoteExpired(r),
    })) } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DEVIS CLIENT — accès par lien personnel (/devis/:token), sans compte
   requis : le token (48 caractères aléatoires) fait office d'autorisation,
   comme un lien de réinitialisation de mot de passe.
───────────────────────────────────────────────────────────── */
const zQuoteToken = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) })

async function findByToken(token: string) {
  return prisma.productRequest.findUnique({
    where: { quoteToken: token },
    include: { order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, winipayerRef: true } } },
  })
}

/** Vue publique du devis — jamais le token d'autres demandes ni de données admin internes. */
async function publicQuote(r: NonNullable<Awaited<ReturnType<typeof findByToken>>>) {
  const totals = await quoteTotals(r)
  return {
    id:              r.id,
    productName:     r.productName,
    description:     r.description,
    images:          r.images ? (JSON.parse(r.images) as string[]) : [],
    clientPrenom:    r.clientPrenom,
    deliveryAddress: r.deliveryAddress,
    adminReply:      r.adminReply,
    status:          r.status,
    expired:         isQuoteExpired(r),
    quoteExpiresAt:  r.quoteExpiresAt,
    declineReason:   r.declineReason,
    decidedAt:       r.decidedAt,
    createdAt:       r.createdAt,
    ...totals,
    order: r.order ? {
      orderNumber:   r.order.orderNumber,
      status:        r.order.status,
      paymentStatus: r.order.paymentStatus,
      total:         r.order.total,
    } : null,
  }
}

/* ── GET /api/product-requests/quote/:token — consulter son devis ── */
router.get('/quote/:token', validateParams(zQuoteToken), async (req, res) => {
  try {
    const r = await findByToken(req.params['token']!)
    if (!r || r.quotedPrice == null) {
      res.status(404).json({ success: false, message: 'Devis introuvable' })
      return
    }
    res.json({ success: true, data: await publicQuote(r) })
  } catch (err) {
    logger.error('[GET quote]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/product-requests/quote/:token/accept — accepter et payer.
 * Crée la commande (en attente) puis le lien de paiement WiniPayer via
 * merchantgo. Rappelable : si la commande existe déjà et n'est pas payée,
 * un nouveau lien de paiement est simplement généré (paiement abandonné,
 * lien expiré…). 100 % en ligne — pas de paiement à la livraison.
 */
router.post('/quote/:token/accept', validateParams(zQuoteToken), async (req, res) => {
  try {
    let r = await findByToken(req.params['token']!)
    if (!r || r.quotedPrice == null) {
      res.status(404).json({ success: false, message: 'Devis introuvable' })
      return
    }
    if (['declined', 'rejected', 'cancelled', 'fulfilled'].includes(r.status)) {
      res.status(400).json({ success: false, message: "Ce devis n'est plus disponible." })
      return
    }
    if (r.order?.paymentStatus === 'paid' || r.status === 'paid') {
      res.status(409).json({ success: false, message: 'Ce devis a déjà été payé.', data: { orderNumber: r.order?.orderNumber } })
      return
    }
    if (!isMerchantgoConfigured()) {
      res.status(503).json({ success: false, message: 'Le paiement en ligne est momentanément indisponible. Réessayez plus tard.' })
      return
    }

    let order = r.order && r.order.status !== 'cancelled' ? r.order : null

    // Une tentative précédente a peut-être abouti sans que le webhook soit
    // encore arrivé : on revérifie AVANT de générer un nouveau lien, pour ne
    // jamais faire payer deux fois ni orpheliner un paiement réussi.
    if (order?.winipayerRef) {
      await refreshWinipayerPayment(order.winipayerRef).catch(() => {})
      r = (await findByToken(req.params['token']!))!
      if (r.order?.paymentStatus === 'paid') {
        res.status(409).json({ success: false, message: 'Ce devis a déjà été payé.', data: { orderNumber: r.order.orderNumber } })
        return
      }
      order = r.order && r.order.status !== 'cancelled' ? r.order : null
    }

    if (!order) {
      // Première acceptation (ou nouvelle après un paiement annulé/échoué) :
      // soumise à la validité du devis.
      if (isQuoteExpired(r)) {
        res.status(400).json({ success: false, message: 'Ce devis a expiré. Contactez-nous pour obtenir un nouveau prix.' })
        return
      }
      const current = r
      const created = await prisma.$transaction(async (tx) => {
        const o = await createSourcingOrder(tx, current)
        await tx.productRequest.update({
          where: { id: current.id },
          data:  { status: 'accepted', orderId: o.id, decidedAt: new Date(), declineReason: null },
        })
        return o
      })
      order = { ...created }
      notifyAdmins(
        'Devis de sourcing accepté',
        `${r.clientPrenom} ${r.clientNom} a accepté le devis « ${r.productName} » — paiement en cours (${created.orderNumber})`,
        `/product-requests/${r.id}`,
      )
    }

    try {
      const payment = await createWinipayerPayment({
        orderId:     order.id,
        orderNumber: order.orderNumber,
        amount:      order.total,
        description: `Devis sourcing ${order.orderNumber} — Skignas`,
        // Retour sur la page du devis, qui revérifie le statut réel (jamais
        // déduit de l'URL utilisée par WiniPayer) — accessible sans compte.
        returnUrl:   `${quoteUrl(req.params['token']!)}?retour=1`,
        cancelUrl:   `${quoteUrl(req.params['token']!)}?retour=1`,
      })
      await prisma.order.update({ where: { id: order.id }, data: { winipayerRef: payment.data.providerRef } })
      res.json({ success: true, data: { paymentUrl: payment.data.checkoutUrl, orderNumber: order.orderNumber } })
    } catch (err) {
      logger.error('[quote accept] échec création paiement WiniPayer', order.orderNumber, err)
      res.status(502).json({ success: false, message: "Le paiement n'a pas pu être initié. Réessayez dans un instant." })
    }
  } catch (err) {
    logger.error('[POST quote accept]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/product-requests/quote/:token/verify — appelé au retour de
 * WiniPayer : force une revérification réelle du paiement (merchantgo
 * rappelle mark-paid/mark-cancelled si l'état est terminal), puis renvoie
 * le devis à jour.
 */
router.post('/quote/:token/verify', validateParams(zQuoteToken), async (req, res) => {
  try {
    const r = await findByToken(req.params['token']!)
    if (!r || r.quotedPrice == null) {
      res.status(404).json({ success: false, message: 'Devis introuvable' })
      return
    }
    if (r.order?.winipayerRef && r.order.paymentStatus !== 'paid' && isMerchantgoConfigured()) {
      await refreshWinipayerPayment(r.order.winipayerRef).catch(err =>
        logger.error('[quote verify] échec revérification', r.order?.orderNumber, err))
    }
    const fresh = (await findByToken(req.params['token']!))!
    res.json({ success: true, data: await publicQuote(fresh) })
  } catch (err) {
    logger.error('[POST quote verify]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const declineSchema = z.object({ reason: z.string().trim().max(500).optional() })

/* ── POST /api/product-requests/quote/:token/decline — refuser le devis ── */
router.post('/quote/:token/decline', validateParams(zQuoteToken), validate(declineSchema), async (req, res) => {
  try {
    const r = await findByToken(req.params['token']!)
    if (!r || r.quotedPrice == null) {
      res.status(404).json({ success: false, message: 'Devis introuvable' })
      return
    }
    if (r.order?.paymentStatus === 'paid' || !['quoted', 'accepted'].includes(r.status)) {
      res.status(400).json({ success: false, message: 'Ce devis ne peut plus être refusé.' })
      return
    }
    const { reason } = req.body as z.infer<typeof declineSchema>

    // Accepté mais jamais payé → la commande en attente est annulée.
    if (r.order && r.order.status !== 'cancelled') {
      await applyOrderStatusChange(r.order.id, 'cancelled')
    }
    await prisma.productRequest.update({
      where: { id: r.id },
      data:  { status: 'declined', declineReason: reason || null, decidedAt: new Date() },
    })
    notifyAdmins(
      'Devis de sourcing refusé',
      `${r.clientPrenom} ${r.clientNom} a refusé le devis « ${r.productName} »${reason ? ` : ${reason}` : ''}`,
      `/product-requests/${r.id}`,
    )

    const fresh = (await findByToken(req.params['token']!))!
    res.json({ success: true, data: await publicQuote(fresh) })
  } catch (err) {
    logger.error('[POST quote decline]', err)
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
    const request = await prisma.productRequest.findUnique({
      where: { id: req.params['id']! },
      include: { order: { select: { orderNumber: true, status: true, paymentStatus: true, total: true } } },
    })
    if (!request) {
      res.status(404).json({ success: false, message: 'Demande introuvable' })
      return
    }

    // Historique sourcing du même client — par compte, sinon par e-mail
    // (demandes faites en invité avant/sans création de compte).
    const history = await prisma.productRequest.findMany({
      where: {
        id: { not: request.id },
        OR: [
          ...(request.userId ? [{ userId: request.userId }] : []),
          { clientEmail: { equals: request.clientEmail, mode: 'insensitive' as const } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, productName: true, status: true, quotedPrice: true, quantity: true,
        quoteExpiresAt: true, createdAt: true,
        order: { select: { orderNumber: true, paymentStatus: true, total: true } },
      },
    })

    res.json({ success: true, data: {
      request: {
        ...request,
        images:  request.images ? JSON.parse(request.images) : [],
        expired: isQuoteExpired(request),
        quoteUrl: request.quoteToken ? quoteUrl(request.quoteToken) : null,
      },
      history: history.map(h => ({ ...h, expired: isQuoteExpired(h) })),
    } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PATCH /api/product-requests/:id/status  [ADMIN]

   La commande n'est plus créée ici : elle naît de l'acceptation du devis
   par le client (POST /quote/:token/accept) et n'est payée que via
   WiniPayer. "fulfilled" = livrée — refusé tant que le devis n'est pas
   payé ; "rejected"/"cancelled" annulent une commande encore impayée.
   accepted/paid/declined ne sont posés que par le client ou la passerelle.
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

    // La commande n'est plus jamais créée ici (autrefois "payée + livrée"
    // sans paiement réel) : elle naît de l'acceptation du devis par le client
    // et n'est payée que via WiniPayer. "fulfilled" = livrée.
    const order = existing.orderId
      ? await prisma.order.findUnique({ where: { id: existing.orderId }, select: { id: true, paymentStatus: true, status: true } })
      : null

    if (status === 'fulfilled' && order && order.paymentStatus !== 'paid') {
      res.status(400).json({ success: false, message: "Le client n'a pas encore payé ce devis — impossible de marquer la demande comme livrée." })
      return
    }
    if (status === 'fulfilled' && order && order.status !== 'delivered') {
      await applyOrderStatusChange(order.id, 'delivered')
    }
    // Demande annulée/refusée par l'admin alors qu'une commande attend encore
    // son paiement → on annule aussi la commande (libère le lien de paiement).
    if ((status === 'rejected' || status === 'cancelled') && order && order.paymentStatus !== 'paid' && order.status !== 'cancelled') {
      await applyOrderStatusChange(order.id, 'cancelled')
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

    // Un prix (nouveau ou déjà envoyé) fait de la réponse un devis que le
    // client peut accepter/payer ou refuser en ligne, valable 7 jours.
    const effectivePrice = quotedPrice ?? request.quotedPrice
    const hasOpenOrder   = !!request.orderId && request.status !== 'declined'
    const isQuote        = effectivePrice != null && !hasOpenOrder
      && ['new', 'processing', 'quoted', 'declined'].includes(request.status)
    const token          = request.quoteToken ?? randomBytes(24).toString('hex')
    const link           = isQuote ? quoteUrl(token) : undefined

    const updated = await prisma.productRequest.update({
      where: { id: request.id },
      data: {
        adminReply:  message,
        quotedPrice: effectivePrice,
        repliedAt:   new Date(),
        ...(isQuote ? {
          status:         'quoted',
          quoteToken:     token,
          quoteExpiresAt: new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 3600 * 1000),
          declineReason:  null,
          decidedAt:      null,
        } : {}),
      },
    })

    await sendProductRequestReplyEmail(request.clientEmail, request.clientPrenom, request.productName, message, effectivePrice, link, QUOTE_VALIDITY_DAYS)

    if (link && request.clientTelephone) {
      sendSms(
        normalizePhoneCI(request.clientTelephone),
        `Skignas : votre devis pour "${request.productName}" est prêt. Consultez-le et payez en ligne : ${link}`,
      ).catch(err => logger.error('[product-requests] échec SMS devis', request.id, err))
    }

    // Notification in-app si le client a un compte
    if (request.userId) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type:   'info',
          title:  link ? 'Votre devis de sourcing est prêt' : 'Réponse à votre demande de sourcing',
          body:   link
            ? `Devis pour "${request.productName}" — acceptez-le et payez en ligne sous ${QUOTE_VALIDITY_DAYS} jours.`
            : `Nous avons répondu à votre demande concernant "${request.productName}"`,
          ...(link ? { link: `/devis/${token}` } : {}),
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
