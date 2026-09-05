/* ─────────────────────────────────────────────────────────────
   Routes internes, appelées serveur-à-serveur par merchantgo (Go) — jamais
   par un navigateur. Sens inverse de lib/merchantgo.ts (backend → merchantgo) :
   ici c'est merchantgo qui nous rappelle une fois un paiement WiniPayer
   confirmé, après l'avoir lui-même revérifié auprès de WiniPayer (jamais de
   confiance dans le seul webhook — voir order_payment_architecture).
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
import { sendOrderConfirmationEmail } from '../lib/mailer'
import { applyOrderStatusChange } from './orders'

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
  if (order.winipayerRef && order.winipayerRef !== providerRef) {
    logger.error('[internal] mark-paid : providerRef ne correspond pas', id, providerRef)
    res.status(409).json({ success: false, message: 'Référence de paiement incohérente' })
    return
  }

  if (order.paymentStatus !== 'paid') {
    await prisma.order.update({ where: { id }, data: { paymentStatus: 'paid' } })
    notifyMerchantsOrderPaid(order.id, order.orderNumber).catch(() => {})

    // Email "commande confirmée" envoyé ICI pour les commandes en ligne —
    // jamais à la création (voir orders.ts step 7) : avant ce point, le
    // client n'a encore rien payé, lui dire "confirmée" serait mensonger.
    sendOrderConfirmationEmail(order.clientEmail, {
      orderNumber:    order.orderNumber,
      prenom:         order.clientPrenom,
      items:          order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal:       order.subtotal,
      shippingCost:   order.shippingCost,
      promoDiscount:  order.promoDiscount,
      total:          order.total,
      paymentMethod:  order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
    }).catch(() => {})
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

  if (order.winipayerRef && order.winipayerRef !== providerRef) {
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

  res.json({ success: true })
})

export default router
