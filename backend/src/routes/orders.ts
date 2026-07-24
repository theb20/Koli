import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth'
import { validate, validateParams, validateQuery, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendNewOrderAdminEmail } from '../lib/mailer'
import { buildInvoicePdf } from '../lib/invoicePdf'
import { sendNewOrderWhatsAppNotification } from '../lib/whatsapp/newOrderNotification'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'
import { getLoyaltySettings } from './loyalty'
import { createInvoice, isPaydunyaConfigured } from '../lib/paydunya'
import { getBackendUrl } from '../lib/backendUrl'

const router = Router()

/* ── Helpers ─────────────────────────────────────────────────── */

function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `KLI-${date}-${rand}`
}

/* ── Schemas ─────────────────────────────────────────────────── */

const createOrderSchema = z.object({
  // Infos client
  clientPrenom:    z.string().min(2),
  clientNom:       z.string().min(2),
  clientEmail:     z.string().email(),
  clientTelephone: z.string().min(8),

  // Livraison
  deliveryMethod: z.enum(['standard', 'express']),
  shippingAddress: z.object({
    ville:      z.string(),
    quartier:   z.string().optional(),
    adresse:    z.string(),
    instructions: z.string().optional(),
  }),

  // Paiement — "online" couvre Orange/MTN/Wave/carte : PayDunya présente le
  // choix de l'opérateur sur sa propre page de paiement, donc distinguer les
  // opérateurs ici n'apportait rien (les 3 anciennes valeurs déclenchaient déjà
  // exactement la même création de facture).
  paymentMethod: z.enum(['online', 'cash']),

  // Articles
  items: z.array(z.object({
    productId: z.number().int().positive(),
    qty:       z.number().int().positive(),
    color:     z.string().optional(),
  })).min(1, 'Le panier est vide'),

  // Promo
  promoCode: z.string().optional(),
  notes:     z.string().max(500).optional(),

  // Idempotence — même clé envoyée deux fois (double-clic, retry réseau) → même commande renvoyée
  clientRequestId: z.string().uuid().optional(),
})

/** Levée quand le stock a été vidé par une autre commande concurrente pendant la transaction. */
class StockError extends Error {
  constructor(productName: string) {
    super(`Stock insuffisant pour "${productName}"`)
  }
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
type OrderStatusValue = typeof ORDER_STATUSES[number]

/**
 * Applique un changement de statut de commande de façon cohérente :
 * — restitue le stock une seule fois si la commande passe à annulée/remboursée
 *   (et ne le refait pas si elle l'était déjà, pour éviter un double crédit) ;
 * — maintient paymentStatus aligné avec l'avancement. Il n'y a pas d'intégration
 *   de passerelle de paiement réelle ici : la progression du statut par un admin
 *   fait office de confirmation manuelle du paiement.
 */
async function applyOrderStatusChange(orderId: string, status: OrderStatusValue) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) return null

    const wasFinalized      = order.status === 'cancelled' || order.status === 'refunded'
    const becomingFinalized = status === 'cancelled' || status === 'refunded'

    if (becomingFinalized && !wasFinalized) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { increment: item.qty }, sold: { decrement: item.qty } },
        })
      }
    }

    // Une commande liée à une facture PayDunya (paydunyaToken posé) a son paiement
    // suivi par la passerelle — seul l'IPN (voir payments.ts) fait foi. Faire
    // progresser son statut manuellement ne doit jamais la faire passer "payée"
    // par raccourci : un admin qui avance une commande par erreur avant que le
    // client ait réellement payé ne doit pas la faire apparaître payée à tort.
    const gatewayTracked = !!order.paydunyaToken
    const paymentStatus =
      status === 'refunded'                                                   ? 'refunded'
      : gatewayTracked                                                         ? order.paymentStatus
      : ['confirmed', 'processing', 'shipped', 'delivered'].includes(status)   ? 'paid'
      : order.paymentStatus // 'pending'/'cancelled' : ne pas inventer un statut de paiement

    // Verrouillé à la première livraison — base du calcul d'éligibilité au retour.
    const deliveredAt = status === 'delivered' && order.status !== 'delivered' ? new Date() : undefined

    const updated = await tx.order.update({ where: { id: orderId }, data: { status, paymentStatus, deliveredAt } })
    return { updated, changed: order.status !== status }
  })
  if (!result) return null

  // Email + notification client à chaque changement réel de statut — non bloquant, ne doit
  // jamais faire échouer la mise à jour si l'envoi échoue. Pas de mail si le statut est
  // resté identique (ex: admin renvoie la même valeur par erreur).
  if (result.changed) {
    sendOrderStatusEmail(result.updated.clientEmail, result.updated.clientPrenom, result.updated.orderNumber, status).catch(() => {})
    if (result.updated.userId) {
      prisma.notification.create({
        data: {
          userId: result.updated.userId,
          type:   'order',
          title:  `Commande ${result.updated.orderNumber} mise à jour`,
          body:   `Nouveau statut : ${status}`,
          link:   `/commandes/${result.updated.orderNumber}`,
        },
      }).catch(() => {})
    }
  }

  return result.updated
}

/* ─────────────────────────────────────────────────────────────
   POST /api/orders  — Créer une commande
───────────────────────────────────────────────────────────── */
router.post('/', optionalAuth, validate(createOrderSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof createOrderSchema>

    // 0. Vérifier que l'utilisateur n'est pas banni
    if (req.user) {
      const account = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { isBanned: true },
      })
      if (account?.isBanned) {
        res.status(403).json({ success: false, message: 'Votre compte est suspendu. Contactez le support.' })
        return
      }
    }

    // 0bis. Le paiement à la livraison peut être désactivé par l'admin (Réglages)
    //       — vérifié côté serveur, pas seulement masqué côté frontend.
    if (body.paymentMethod === 'cash') {
      const settings = await prisma.siteSettings.upsert({
        where: { id: 1 }, update: {}, create: { id: 1 }, select: { codEnabled: true },
      })
      if (!settings.codEnabled) {
        res.status(400).json({ success: false, message: 'Le paiement à la livraison n\'est plus disponible. Merci de payer en ligne.' })
        return
      }
    }

    // 0ter. Idempotence — requête déjà traitée (double-clic, retry réseau) → renvoyer la commande existante
    if (body.clientRequestId) {
      const existing = await prisma.order.findUnique({ where: { clientRequestId: body.clientRequestId } })
      if (existing) {
        res.status(200).json({
          success: true,
          message: 'Commande déjà créée',
          data: {
            orderNumber:   existing.orderNumber,
            orderId:       existing.id,
            total:         existing.total,
            shippingCost:  existing.shippingCost,
            promoDiscount: existing.promoDiscount,
            pointsEarned:  existing.pointsEarned,
          },
        })
        return
      }
    }

    // 1. Récupérer les produits (infos affichage + pré-vérification amicale du stock)
    const productIds = body.items.map(i => i.productId)
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    })

    if (products.length !== productIds.length) {
      res.status(400).json({ success: false, message: 'Un ou plusieurs produits sont introuvables' })
      return
    }

    // Pré-vérification — message amical immédiat. Le garde-fou réel (contre les accès
    // concurrents) est la décrémentation atomique faite plus bas, dans la transaction.
    for (const item of body.items) {
      const p = products.find(p => p.id === item.productId)!
      if (p.stock !== null && p.stock === 0) {
        res.status(400).json({ success: false, message: `"${p.name}" est en rupture de stock` })
        return
      }
      if (p.stock !== null && p.stock < item.qty) {
        res.status(400).json({ success: false, message: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock})` })
        return
      }
    }

    // 2. Calculer les totaux
    const subtotal = body.items.reduce((sum, item) => {
      const p = products.find(p => p.id === item.productId)!
      return sum + p.price * item.qty
    }, 0)

    const shippingCost = (() => {
      if (subtotal >= 25_000) return 0        // livraison gratuite
      return body.deliveryMethod === 'express' ? 3_500 : 1_500
    })()

    // 3. Récupérer le taux de TVA par défaut
    const defaultTax = await prisma.taxRate.findFirst({
      where: { isDefault: true, isActive: true },
    })
    const taxRatePercent = defaultTax?.rate ?? 0
    const taxAmount      = Math.round(subtotal * taxRatePercent / 100)

    const { loyaltyEnabled } = await getLoyaltySettings()

    // 4. Valider le code promo (lecture) — l'application définitive (et le contrôle du
    //    quota d'utilisation contre les accès concurrents) se fait dans la transaction plus bas.
    let promoDiscount = 0
    let validatedCode: string | null = null
    let promoId: number | null = null
    let promoMaxUses: number | null = null
    if (body.promoCode) {
      const now = new Date()
      const promo = await prisma.promoCode.findFirst({
        where: {
          code:     body.promoCode.toUpperCase(),
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      })
      const quotaOk = !promo || promo.maxUses == null || promo.usedCount < promo.maxUses
      if (promo && quotaOk && subtotal >= promo.minOrder) {
        promoDiscount = promo.type === 'percent'
          ? Math.round(subtotal * promo.value / 100)
          : promo.value
        validatedCode = promo.code
        promoId       = promo.id
        promoMaxUses  = promo.maxUses
      }
    }

    // Points gagnés : 1 point par 100 FCFA dépensés (calcul optimiste, ajusté si la promo est perdue dans la course)
    const orderNumber = generateOrderNumber()

    // 5. Transaction — décrémentation de stock + réservation du code promo + création de la
    //    commande sont tout-ou-rien : soit tout réussit ensemble, soit rien n'est appliqué.
    const order = await prisma.$transaction(async (tx) => {
      // Décrémentation atomique du stock — la vraie garantie contre la survente.
      // "stock >= qty" et la décrémentation se font dans la même requête ; Postgres sérialise
      // les accès concurrents sur la même ligne, donc deux commandes ne peuvent jamais toutes
      // les deux réussir sur le dernier exemplaire disponible.
      for (const item of body.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.qty } },
          data:  { stock: { decrement: item.qty }, sold: { increment: item.qty } },
        })
        if (updated.count === 0) {
          const p = products.find(pr => pr.id === item.productId)
          throw new StockError(p?.name ?? String(item.productId))
        }
      }

      // Réservation atomique du code promo — même logique que le stock : si un autre client
      // a épuisé le quota entre-temps, on annule juste la remise (pas toute la commande).
      let finalPromoDiscount = promoDiscount
      let finalPromoCode     = validatedCode
      if (promoId !== null) {
        const promoUpdate = await tx.promoCode.updateMany({
          where: {
            id: promoId,
            ...(promoMaxUses != null ? { usedCount: { lt: promoMaxUses } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        })
        if (promoUpdate.count === 0) {
          finalPromoDiscount = 0
          finalPromoCode     = null
        }
      }

      const finalTotal        = subtotal + taxAmount - finalPromoDiscount + shippingCost
      const finalPointsEarned = (req.user?.userId && loyaltyEnabled) ? Math.floor(finalTotal / 100) : 0

      return tx.order.create({
        data: {
          orderNumber,
          clientRequestId: body.clientRequestId,
          userId:          req.user?.userId ?? null,
          clientPrenom:    body.clientPrenom,
          clientNom:       body.clientNom,
          clientEmail:     body.clientEmail,
          clientTelephone: body.clientTelephone,
          deliveryMethod:  body.deliveryMethod,
          shippingAddress: JSON.stringify(body.shippingAddress),
          shippingCost,
          paymentMethod:   body.paymentMethod,
          subtotal,
          taxRate:         taxRatePercent,
          taxAmount,
          promoCode:       finalPromoCode,
          promoDiscount:   finalPromoDiscount,
          pointsEarned:    finalPointsEarned,
          total:           finalTotal,
          notes:           body.notes,
          items: {
            create: body.items.map(item => {
              const p = products.find(p => p.id === item.productId)!
              return {
                productId: p.id,
                name:      p.name,
                brand:     p.brand,
                price:     p.price,
                qty:       item.qty,
                image:     p.images[0]?.url ?? '',
                color:     item.color,
              }
            }),
          },
        },
        include: { items: true },
      })
    })

    // 6a. Fidélité : créditer les points réellement gagnés (après résolution de la promo)
    if (req.user?.userId && order.pointsEarned > 0) {
      await Promise.all([
        prisma.user.update({ where: { id: req.user.userId }, data: { loyaltyPoints: { increment: order.pointsEarned } } }),
        prisma.pointTransaction.create({
          data: { userId: req.user.userId, orderId: order.id, type: 'earn', points: order.pointsEarned, note: `Gagnés sur commande ${orderNumber}` },
        }),
      ])
    }

    // 6b. Notification en base (si utilisateur connecté)
    if (req.user?.userId) {
      const notifLines = [`Votre commande ${orderNumber} a bien été reçue.`]
      if (order.pointsEarned > 0) notifLines.push(`+${order.pointsEarned} points Skignas crédités !`)
      await prisma.notification.create({
        data: {
          userId: req.user.userId,
          type:   'order',
          title:  'Commande reçue',
          body:   notifLines.join(' '),
          link:   `/commandes/${orderNumber}`,
        },
      })
    }

    // 6c. Sauvegarder l'adresse de livraison dans le carnet d'adresses si elle est nouvelle —
    //     évite les doublons en comparant ville + adresse + téléphone (normalisés).
    if (req.user?.userId) {
      try {
        const norm = (s: string) => s.trim().toLowerCase()
        const existingAddresses = await prisma.address.findMany({ where: { userId: req.user.userId } })
        const isDuplicate = existingAddresses.some(a =>
          norm(a.ville) === norm(body.shippingAddress.ville) &&
          norm(a.adresse) === norm(body.shippingAddress.adresse) &&
          norm(a.telephone) === norm(body.clientTelephone)
        )
        if (!isDuplicate) {
          await prisma.address.create({
            data: {
              userId:    req.user.userId,
              label:     'Autre',
              prenom:    body.clientPrenom,
              nom:       body.clientNom,
              telephone: body.clientTelephone,
              ville:     body.shippingAddress.ville,
              quartier:  body.shippingAddress.quartier,
              adresse:   body.shippingAddress.adresse,
              isDefault: existingAddresses.length === 0,
            },
          })
        }
      } catch (err) {
        logger.error('[orders] échec sauvegarde adresse auto', err) // non bloquant
      }
    }

    // 6d. Notifier les administrateurs — bulle in-app + email(s) configurés dans les paramètres.
    //     Ne bloque jamais la réponse au client si ça échoue.
    ;(async () => {
      try {
        const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map(a => ({
              userId: a.id,
              type:   'order',
              title:  'Nouvelle commande',
              body:   `${body.clientPrenom} ${body.clientNom} · ${order.total.toLocaleString('fr-FR')} FCFA · ${orderNumber}`,
              link:   `/orders/${order.id}`,
            })),
          })
        }

        const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { orderNotifyEmails: true, whatsappNumber: true } })
        const recipients = (settings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean)
        await Promise.allSettled(recipients.map(email => sendNewOrderAdminEmail(email, {
          orderNumber,
          clientNom:       `${body.clientPrenom} ${body.clientNom}`,
          clientTelephone: body.clientTelephone,
          clientEmail:     body.clientEmail,
          items:           order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          total:           order.total,
          paymentMethod:   body.paymentMethod,
          deliveryMethod:  body.deliveryMethod,
          orderId:         order.id,
        })))

        // Notification WhatsApp équipe — best-effort, silencieuse tant que
        // WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID ne sont pas configurés.
        if (settings?.whatsappNumber) {
          sendNewOrderWhatsAppNotification(settings.whatsappNumber, {
            orderNumber,
            orderId:         order.id,
            clientNom:       `${body.clientPrenom} ${body.clientNom}`,
            clientTelephone: body.clientTelephone,
            total:           order.total,
            paymentMethod:   body.paymentMethod,
          }).catch(err => logger.error('[orders] échec notification WhatsApp', err))
        }
      } catch (err) {
        logger.error('[orders] échec notification admin', err) // non bloquant
      }
    })()

    // 6e. Notifier le(s) marchand(s) concerné(s) — un marchand n'est alerté que pour SES
    //     propres produits dans la commande, sans identité/coordonnées du client : la
    //     commande complète ne lui est communiquée qu'après confirmation du paiement
    //     (côté koli-marchand), cette notification n'est qu'une alerte de nouvelle activité.
    ;(async () => {
      try {
        const storeIds = [...new Set(products.map(p => p.storeId).filter((id): id is number => id != null))]
        if (storeIds.length === 0) return

        const stores = await prisma.sellerStore.findMany({
          where:  { id: { in: storeIds } },
          select: { id: true, userId: true },
        })

        const notifData = stores.map(store => {
          const storeItems = body.items.filter(item => {
            const p = products.find(pr => pr.id === item.productId)
            return p?.storeId === store.id
          })
          const itemCount = storeItems.reduce((sum, i) => sum + i.qty, 0)
          return {
            userId: store.userId,
            type:   'order',
            title:  'Nouvelle commande reçue',
            body:   `${itemCount} article${itemCount > 1 ? 's' : ''} · ${orderNumber}`,
            link:   `/commandes`,
          }
        })

        if (notifData.length > 0) {
          await prisma.notification.createMany({ data: notifData })
        }
      } catch (err) {
        logger.error('[orders] échec notification marchand', err) // non bloquant
      }
    })()

    // 7. Email de confirmation (sans bloquer)
    sendOrderConfirmationEmail(body.clientEmail, {
      orderNumber,
      prenom:        body.clientPrenom,
      items:         order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal,
      shippingCost,
      promoDiscount: order.promoDiscount,
      total:         order.total,
      paymentMethod: body.paymentMethod,
      deliveryMethod: body.deliveryMethod,
    }).catch(() => {})

    // 8. Paiement en ligne PayDunya (orange/mtn/wave) — crée la facture et
    //    renvoie l'URL de paiement au client, qui y est redirigé. "cash"
    //    reste inchangé (paiement à la livraison). Si PayDunya n'est pas
    //    configuré ou échoue, la commande reste créée quand même (stock déjà
    //    réservé plus haut) — dégradation, pas d'échec de toute la commande
    //    pour un incident côté prestataire de paiement.
    let paymentUrl: string | undefined
    if (body.paymentMethod !== 'cash' && isPaydunyaConfigured()) {
      try {
        const backendUrl  = getBackendUrl()
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
        const invoice = await createInvoice({
          amount:        order.total,
          description:   `Commande ${orderNumber} — Skignas`,
          orderId:       order.id,
          orderNumber,
          returnUrl:     `${frontendUrl}/commandes/${orderNumber}`,
          cancelUrl:     `${frontendUrl}/commandes/${orderNumber}`,
          callbackUrl:   `${backendUrl}/api/payments/paydunya/ipn`,
          customerName:  `${body.clientPrenom} ${body.clientNom}`,
          customerEmail: body.clientEmail,
        })
        await prisma.order.update({ where: { id: order.id }, data: { paydunyaToken: invoice.token } })
        paymentUrl = invoice.checkoutUrl
      } catch (err) {
        logger.error('[orders] échec création facture PayDunya', orderNumber, err)
      }
    }

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        orderNumber:     order.orderNumber,
        orderId:         order.id,
        total:           order.total,
        shippingCost:    order.shippingCost,
        promoDiscount:   order.promoDiscount,
        pointsEarned:    order.pointsEarned,
        paymentUrl,
      },
    })
  } catch (err) {
    if (err instanceof StockError) {
      res.status(400).json({ success: false, message: err.message })
      return
    }
    // Idempotence : deux requêtes concurrentes avec la même clientRequestId — la seconde
    // percute la contrainte unique plutôt que le pré-check (fenêtre de course très étroite).
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      const clientRequestId = (req.body as { clientRequestId?: string }).clientRequestId
      const existing = clientRequestId
        ? await prisma.order.findUnique({ where: { clientRequestId } })
        : null
      if (existing) {
        res.status(200).json({
          success: true,
          message: 'Commande déjà créée',
          data: {
            orderNumber:   existing.orderNumber,
            orderId:       existing.id,
            total:         existing.total,
            shippingCost:  existing.shippingCost,
            promoDiscount: existing.promoDiscount,
            pointsEarned:  existing.pointsEarned,
          },
        })
        return
      }
    }
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la commande' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders  — Mes commandes
───────────────────────────────────────────────────────────── */
const myOrdersQuerySchema = zPaginationQuery.extend({
  limit:  z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.string().max(20).optional(),
})

router.get('/', requireAuth, validateQuery(myOrdersQuerySchema), async (req, res) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof myOrdersQuerySchema>

    const where = {
      userId: req.user!.userId,
      ...(status ? { status } : {}),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: {
            select: { id: true, name: true, qty: true, price: true, image: true },
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/admin/all  [ADMIN]
   ⚠️  DOIT être déclaré AVANT /:id pour ne pas être masqué
───────────────────────────────────────────────────────────── */
const ordersAdminQuerySchema = zPaginationQuery.extend({
  // 200, pas 100 : le dashboard admin (DashboardPage.tsx) charge jusqu'à
  // 200 commandes pour calculer ses statistiques agrégées.
  limit:  z.coerce.number().int().positive().max(200).optional().default(20),
  status: z.string().max(20).optional(),
  q:      z.string().max(200).optional(),
})

router.get('/admin/all', requireAdmin, validateQuery(ordersAdminQuerySchema), async (req, res) => {
  try {
    const { page, limit, status, q } = req.query as unknown as z.infer<typeof ordersAdminQuerySchema>

    const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { orderNumber: { contains: q } },
        { clientEmail: { contains: q } },
        { clientTelephone: { contains: q } },
      ] } : {}),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { items: { select: { name: true, qty: true, image: true } } },
      }),
    ])

    res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/:id  — Détail commande
───────────────────────────────────────────────────────────── */
router.get('/:id', optionalAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const paramId = req.params['id'] ?? ''
    const isAdmin = req.user?.role === 'admin'

    const order = await prisma.order.findFirst({
      where: {
        AND: [
          // Cherche par id (CUID) OU par orderNumber (KLI-...)
          { OR: [{ id: paramId }, { orderNumber: paramId }] },
          // Admin → toutes les commandes
          // Connecté non-admin → commande lui appartenant OU commande invité (userId null)
          // Non connecté → commande invité seulement
          ...(isAdmin
            ? []
            : req.user
              ? [{ OR: [{ userId: req.user.userId }, { userId: null }] }]
              : [{ userId: null }]),
        ],
      },
      include: { items: true },
    })

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    res.json({ success: true, data: order })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/:id/invoice  — Facture PDF
   Même règle d'accès que GET /:id (propriétaire, commande invité, ou admin).
───────────────────────────────────────────────────────────── */
router.get('/:id/invoice', optionalAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const paramId = req.params['id'] ?? ''
    const isAdmin = req.user?.role === 'admin'

    const order = await prisma.order.findFirst({
      where: {
        AND: [
          { OR: [{ id: paramId }, { orderNumber: paramId }] },
          ...(isAdmin
            ? []
            : req.user
              ? [{ OR: [{ userId: req.user.userId }, { userId: null }] }]
              : [{ userId: null }]),
        ],
      },
      include: { items: true },
    })

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    const settings = await prisma.siteSettings.upsert({ where: { id: 1 }, create: {}, update: {} })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="facture-${order.orderNumber}.pdf"`)

    const doc = buildInvoicePdf(order, settings)
    doc.pipe(res)
    doc.end()
  } catch (err) {
    logger.error('[INVOICE]', err)
    res.status(500).json({ success: false, message: 'Erreur lors de la génération de la facture' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/cancel  — Annuler une commande
───────────────────────────────────────────────────────────── */
router.put('/:id/cancel', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params['id'] }, { orderNumber: req.params['id'] }], userId: req.user!.userId },
    })

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      res.status(400).json({ success: false, message: 'Cette commande ne peut plus être annulée' })
      return
    }

    await applyOrderStatusChange(order.id, 'cancelled')

    res.json({ success: true, message: 'Commande annulée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/status  [ADMIN]
───────────────────────────────────────────────────────────── */
router.put('/:id/status', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const schema = z.object({ status: z.enum(ORDER_STATUSES) })
    const { status } = schema.parse(req.body)

    const order = await applyOrderStatusChange(req.params['id']!, status)
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    logAdminAction(req, { action: 'order.status.update', targetType: 'Order', targetId: req.params['id']!, metadata: { newStatus: status } })
    res.json({ success: true, message: 'Statut mis à jour' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/orders/:id/status  [ADMIN] — alias PATCH ─── */
router.patch('/:id/status', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const schema = z.object({ status: z.enum(ORDER_STATUSES) })
    const { status } = schema.parse(req.body)

    const order = await applyOrderStatusChange(req.params['id']!, status)
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }
    logAdminAction(req, { action: 'order.status.update', targetType: 'Order', targetId: req.params['id']!, metadata: { newStatus: status } })
    res.json({ success: true, data: { order } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
