/* ─────────────────────────────────────────────────────────────
   Routes internes, appelées serveur-à-serveur par merchantgo (Go) — jamais
   par un navigateur. Sens inverse de lib/merchantgo.ts (backend → merchantgo) :
   ici c'est merchantgo qui nous rappelle une fois un paiement GeniusPay (ou
   WiniPayer pour une commande encore en attente au moment de la bascule)
   confirmé, après l'avoir lui-même revérifié auprès de la passerelle
   (jamais de confiance dans le seul webhook — voir order_payment_architecture).
   Protégé par requireApiKey('MERCHANTGO_CALLBACK_SECRET'), symétrique de
   MERCHANTGO_ADMIN_API_KEY côté sortant.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireApiKey } from '../middleware/auth'
import { validate, validateParams, zCuidIdParam } from '../middleware/validate'
import { logger } from '../lib/logger'
import { notifyMerchantsOrderPaid } from '../lib/merchantWallet'
import { snapshotOrderFinancialsSafe } from '../lib/finance/snapshot'
import { sendOrderConfirmationEmail, sendReturnStatusEmail, sendOrderStatusEmail, sendSubscriptionInvoiceEmail, sendStoreSuspendedEmail, sendStoreReactivatedEmail } from '../lib/mailer'
import { applyOrderStatusChange } from './orders'
import { sendSms } from '../lib/sms/zavu'
import { normalizePhoneCI } from '../lib/phone'
import { computeMaxRefundable, RETURN_INCLUDE } from './returns'
import { notifyMerchantsOrderRefunded } from '../lib/merchantWallet'

function fmtFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

const router = Router()
router.use(requireApiKey('MERCHANTGO_CALLBACK_SECRET'))

const markPaidSchema = z.object({
  providerRef: z.string().min(1),
  operator:    z.string().optional(),
})

router.post('/orders/:id/mark-paid', validateParams(zCuidIdParam), validate(markPaidSchema), async (req, res) => {
  const { id } = req.params as unknown as { id: string }
  const { providerRef } = req.body as z.infer<typeof markPaidSchema>

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) {
    res.status(404).json({ success: false, message: 'Commande introuvable' })
    return
  }

  // La commande doit bien être celle pour laquelle CE paiement a été créé —
  // défense en profondeur au cas où un mauvais id serait transmis, même si
  // merchantgo est authentifié par clé de service.
  // geniusPayRef pour une commande créée depuis la bascule ; winipayerRef en
  // repli pour une commande encore suivie par WiniPayer au moment de la
  // bascule — jamais les deux posés sur une même commande.
  const gatewayRef = order.geniusPayRef ?? order.winipayerRef
  if (gatewayRef && gatewayRef !== providerRef) {
    logger.error('[internal] mark-paid : providerRef ne correspond pas', id, providerRef)
    res.status(409).json({ success: false, message: 'Référence de paiement incohérente' })
    return
  }

  if (order.paymentStatus !== 'paid') {
    await prisma.order.update({ where: { id }, data: { paymentStatus: 'paid', paidAt: new Date() } })
    notifyMerchantsOrderPaid(order.id, order.orderNumber, order.paymentMethod).catch(() => {})
    snapshotOrderFinancialsSafe(order.id)

    // Commande issue d'un devis de sourcing → la demande passe "payée" et
    // l'équipe est prévenue qu'elle peut lancer l'achat.
    const sourcing = await prisma.productRequest.findUnique({ where: { orderId: order.id }, select: { id: true, productName: true } })
    if (sourcing) {
      await prisma.productRequest.update({ where: { id: sourcing.id }, data: { status: 'paid' } })
      const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
      await prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          type:   'order',
          title:  'Devis de sourcing payé',
          body:   `« ${sourcing.productName} » payé (${fmtFCFA(order.total)}) — commande ${order.orderNumber}, achat à lancer.`,
          link:   `/product-requests/${sourcing.id}`,
        })),
      }).catch(err => logger.error('[internal] échec notification devis payé', err))
    }

    // Email "commande confirmée" envoyé ICI pour les commandes en ligne —
    // jamais à la création (voir orders.ts step 7) : avant ce point, le
    // client n'a encore rien payé, lui dire "confirmée" serait mensonger.
    sendOrderConfirmationEmail(order.clientEmail, {
      orderNumber:    order.orderNumber,
      prenom:         order.clientPrenom,
      items:          order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal:       order.subtotal,
      assistanceTotal: order.assistanceTotal,
      shippingCost:   order.shippingCost,
      promoDiscount:  order.promoDiscount,
      total:          order.total,
      paymentMethod:  order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
    }).catch(() => {})

    sendSms(
      normalizePhoneCI(order.clientTelephone),
      `Skignas : votre paiement de ${fmtFCFA(order.total)} pour la commande ${order.orderNumber} est confirmé. Merci !`,
    ).catch(err => logger.error('[internal] échec SMS confirmation paiement', order.orderNumber, err))
  }

  res.json({ success: true })
})

const markCancelledSchema = z.object({
  providerRef: z.string().min(1),
  reason:      z.enum(['cancelled', 'failed']),
})

/**
 * Appelée par merchantgo quand WiniPayer confirme qu'un paiement est
 * définitivement annulé (client) ou échoué (refusé/expiré) — jamais sur un
 * simple statut "pending". Annule la commande associée (stock libéré via
 * applyOrderStatusChange) et enregistre la raison pour que le frontend
 * distingue "Paiement annulé" (neutre) de "Paiement échoué" (technique).
 */
router.post('/orders/:id/mark-cancelled', validateParams(zCuidIdParam), validate(markCancelledSchema), async (req, res) => {
  const { id } = req.params as unknown as { id: string }
  const { providerRef, reason } = req.body as z.infer<typeof markCancelledSchema>

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    res.status(404).json({ success: false, message: 'Commande introuvable' })
    return
  }

  // geniusPayRef pour une commande créée depuis la bascule ; winipayerRef en
  // repli pour une commande encore suivie par WiniPayer au moment de la
  // bascule — jamais les deux posés sur une même commande.
  const gatewayRef = order.geniusPayRef ?? order.winipayerRef
  if (gatewayRef && gatewayRef !== providerRef) {
    logger.error('[internal] mark-cancelled : providerRef ne correspond pas', id, providerRef)
    res.status(409).json({ success: false, message: 'Référence de paiement incohérente' })
    return
  }

  // Garde-fou impératif : un webhook d'annulation arrivé en retard (ou
  // rejoué) ne doit JAMAIS faire régresser une commande déjà payée — sans ce
  // contrôle, applyOrderStatusChange changerait quand même order.status vers
  // "cancelled" sans toucher paymentStatus, laissant une commande payée mais
  // marquée annulée. Idempotent aussi côté "déjà annulée" : un webhook rejoué
  // trois fois ne doit produire qu'un seul effet réel.
  if (order.paymentStatus === 'paid' || order.status === 'cancelled') {
    res.json({ success: true, message: 'Aucun changement (commande déjà finalisée)' })
    return
  }

  await applyOrderStatusChange(order.id, 'cancelled')
  await prisma.order.update({ where: { id }, data: { paymentFailureReason: reason } })

  const smsText = reason === 'failed'
    ? `Skignas : le paiement de votre commande ${order.orderNumber} a échoué. La commande a été annulée.`
    : `Skignas : le paiement de votre commande ${order.orderNumber} a été annulé. La commande a été annulée.`
  sendSms(normalizePhoneCI(order.clientTelephone), smsText)
    .catch(err => logger.error('[internal] échec SMS annulation paiement', order.orderNumber, err))

  res.json({ success: true })
})

const markRefundedSchema = z.object({
  providerRef: z.string().min(1),
})

/**
 * Appelée par merchantgo après confirmation d'un remboursement GeniusPay
 * (webhook "payment.refunded", revérifié côté merchantgo auprès de
 * GeniusPay). GeniusPay n'expose aucune API pour DÉCLENCHER un
 * remboursement (voir merchantgo/internal/geniuspay/client.go) : l'action
 * reste toujours faite manuellement par un humain sur son dashboard — cet
 * endpoint ne fait que réconcilier automatiquement, selon ce qui est en
 * attente pour cette commande : un retour "received" (flux OrderReturn),
 * OU un remboursement direct "refund_pending" (POST /:id/refund, sans
 * retour physique) — jamais les deux à la fois pour une même commande.
 */
router.post('/orders/:id/mark-refunded', validateParams(zCuidIdParam), validate(markRefundedSchema), async (req, res) => {
  const { id } = req.params as unknown as { id: string }
  const { providerRef } = req.body as z.infer<typeof markRefundedSchema>

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    res.status(404).json({ success: false, message: 'Commande introuvable' })
    return
  }
  if (order.geniusPayRef && order.geniusPayRef !== providerRef) {
    logger.error('[internal] mark-refunded : providerRef ne correspond pas', id, providerRef)
    res.status(409).json({ success: false, message: 'Référence de paiement incohérente' })
    return
  }

  // Réconciliation automatique seulement quand un SEUL retour "received"
  // existe pour cette commande — ambigu (plusieurs) ou absent (remboursement
  // fait hors du flux de retour, ou retour pas encore réceptionné) laissé à
  // l'admin : réponse 200 (pas d'erreur, le webhook ne doit pas être rejoué
  // indéfiniment pour un cas qui ne se résoudra jamais tout seul).
  const candidates = await prisma.orderReturn.findMany({
    where: { orderId: order.id, status: 'received' },
    include: RETURN_INCLUDE,
  })
  if (candidates.length !== 1) {
    // Pas de retour produit en jeu — vérifie s'il s'agit d'un remboursement
    // DIRECT de commande en attente (POST /:id/refund) avant d'abandonner.
    if (order.paymentStatus === 'refund_pending') {
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'refunded', refundedAt: new Date(), refundReference: providerRef },
      })
      sendOrderStatusEmail(updatedOrder.clientEmail, updatedOrder.clientPrenom, updatedOrder.orderNumber, 'refunded').catch(() => {})
      logger.info('[internal] remboursement direct de commande confirmé via webhook GeniusPay', id, providerRef)
      res.json({ success: true, message: 'Remboursement direct confirmé' })
      return
    }
    logger.warn('[internal] mark-refunded : aucun retour "received" unique ni remboursement direct en attente', id, candidates.length)
    res.json({ success: true, message: 'Remboursement confirmé, aucun retour à réconcilier automatiquement' })
    return
  }

  const ret = candidates[0]!
  const refundAmount = ret.refundAmount ?? await computeMaxRefundable(ret.id)
  const updated = await prisma.orderReturn.update({
    where: { id: ret.id },
    data: { status: 'refunded', refundedAt: new Date(), refundAmount, refundMethod: 'geniuspay' },
  })

  notifyMerchantsOrderRefunded(ret.id).catch(err => logger.error('[internal] échec notification remboursement marchand', ret.id, err))
  sendReturnStatusEmail(ret.order.clientEmail, ret.order.clientPrenom, ret.order.orderNumber, 'refunded').catch(() => {})
  prisma.notification.create({
    data: {
      userId: ret.userId,
      type:   'return',
      title:  `Retour ${ret.order.orderNumber} mis à jour`,
      body:   'Nouveau statut : refunded',
      link:   `/commandes/${ret.order.orderNumber}`,
    },
  }).catch(() => {})

  res.json({ success: true, data: updated })
})

/* ─────────────────────────────────────────────────────────────
   Facturation d'abonnement — appelée par merchantgo (SubscriptionInvoice),
   jamais par un navigateur. merchantgo n'a pas de client email, tout
   l'envoi réel vit ici. Voir order_payment_architecture : la DÉCISION
   (générer, relancer, suspendre, réactiver) reste dans merchantgo, ce
   fichier n'exécute que l'effet de bord "communiquer avec le marchand".
───────────────────────────────────────────────────────────── */
const subscriptionInvoiceSchema = z.object({
  amount:      z.number().int().positive(),
  checkoutUrl: z.string().url(),
  dueAt:       z.string().datetime(),
  periodStart: z.string(), // "AAAA-MM-01"
})
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

router.post('/merchants/:id/subscription-invoice', validateParams(zCuidIdParam), validate(subscriptionInvoiceSchema), async (req, res) => {
  const { id: userId } = req.params as unknown as { id: string }
  const body = req.body as z.infer<typeof subscriptionInvoiceSchema>

  const store = await prisma.sellerStore.findUnique({ where: { userId }, select: { user: { select: { email: true } } } })
  if (!store) {
    res.status(404).json({ success: false, message: 'Marchand introuvable' })
    return
  }

  const periodStart = new Date(body.periodStart)
  const periodLabel = `${MONTH_LABELS[periodStart.getUTCMonth()]} ${periodStart.getUTCFullYear()}`

  sendSubscriptionInvoiceEmail(store.user.email, {
    amount: body.amount, checkoutUrl: body.checkoutUrl, dueAt: new Date(body.dueAt), periodLabel,
  }).catch(err => logger.error('[internal] échec email facture abonnement', userId, err))

  await prisma.notification.create({
    data: {
      userId,
      type: 'billing',
      title: `Facture d'abonnement — ${periodLabel}`,
      body: `${body.amount.toLocaleString('fr-FR')} FCFA à régler avant le ${new Date(body.dueAt).toLocaleDateString('fr-FR')}`,
      link: '/facturation',
    },
  })

  res.json({ success: true })
})

const suspendSchema = z.object({
  reason:      z.string().min(1).max(500),
  checkoutUrl: z.string().url().optional(),
})

router.post('/merchants/:id/suspend', validateParams(zCuidIdParam), validate(suspendSchema), async (req, res) => {
  const { id: userId } = req.params as unknown as { id: string }
  const body = req.body as z.infer<typeof suspendSchema>

  const store = await prisma.sellerStore.findUnique({ where: { userId }, select: { id: true, suspendedAt: true, user: { select: { email: true } } } })
  if (!store) {
    res.status(404).json({ success: false, message: 'Marchand introuvable' })
    return
  }
  // Idempotent — un rappel (webhook rejoué, cycle relancé) ne doit jamais
  // réécraser suspendedAt ni renvoyer un deuxième email de suspension.
  if (store.suspendedAt) {
    res.json({ success: true, message: 'Déjà suspendu' })
    return
  }

  await prisma.sellerStore.update({ where: { id: store.id }, data: { suspendedAt: new Date(), suspensionReason: body.reason } })
  sendStoreSuspendedEmail(store.user.email, { reason: body.reason, checkoutUrl: body.checkoutUrl }).catch(err => logger.error('[internal] échec email suspension', userId, err))
  await prisma.notification.create({
    data: { userId, type: 'billing', title: 'Boutique suspendue', body: body.reason, link: '/facturation' },
  })

  logger.info('[internal] boutique suspendue automatiquement', userId, body.reason)
  res.json({ success: true })
})

router.post('/merchants/:id/unsuspend', validateParams(zCuidIdParam), async (req, res) => {
  const { id: userId } = req.params as unknown as { id: string }

  const store = await prisma.sellerStore.findUnique({ where: { userId }, select: { id: true, suspendedAt: true, user: { select: { email: true } } } })
  if (!store) {
    res.status(404).json({ success: false, message: 'Marchand introuvable' })
    return
  }
  if (!store.suspendedAt) {
    res.json({ success: true, message: 'Déjà actif' })
    return
  }

  await prisma.sellerStore.update({ where: { id: store.id }, data: { suspendedAt: null, suspensionReason: null } })
  sendStoreReactivatedEmail(store.user.email).catch(err => logger.error('[internal] échec email réactivation', userId, err))
  await prisma.notification.create({
    data: { userId, type: 'billing', title: 'Boutique réactivée', body: 'Votre catalogue est de nouveau visible.', link: '/facturation' },
  })

  logger.info('[internal] boutique réactivée', userId)
  res.json({ success: true })
})

export default router
