/* ─────────────────────────────────────────────────────────────
   Demande d'avis à la livraison — appelée à chaque passage d'une commande
   en "delivered" (admin via applyOrderStatusChange, marchand via
   seller.ts, sourcing via product-requests.ts). Envoie UNE seule fois par
   commande un lien personnel /avis/:token (e-mail + SMS + notification),
   utilisable sans compte. Non bloquant : n'échoue jamais la transition.
───────────────────────────────────────────────────────────── */
import { randomBytes } from 'node:crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { sendReviewRequestEmail } from './mailer'
import { sendSms } from './sms/zavu'
import { normalizePhoneCI } from './phone'

export const reviewUrl = (token: string) =>
  `${process.env.FRONTEND_URL ?? 'https://skignas.com'}/avis/${token}`

export async function requestOrderReview(orderId: string): Promise<void> {
  try {
    const token = randomBytes(24).toString('hex')

    // Réservation atomique : seule la première livraison envoie la demande,
    // même si deux transitions "delivered" arrivent en même temps.
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, reviewRequestedAt: null, status: 'delivered' },
      data:  { reviewToken: token, reviewRequestedAt: new Date() },
    })
    if (claimed.count === 0) return

    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: { orderNumber: true, clientPrenom: true, clientEmail: true, clientTelephone: true, userId: true },
    })
    if (!order) return
    const link = reviewUrl(token)

    await Promise.allSettled([
      sendReviewRequestEmail(order.clientEmail, order.clientPrenom, order.orderNumber, link),
      order.clientTelephone
        ? sendSms(normalizePhoneCI(order.clientTelephone),
            `Skignas : votre commande ${order.orderNumber} est livrée. Donnez-nous votre avis en 1 minute : ${link}`)
        : Promise.resolve(),
      order.userId
        ? prisma.notification.create({
            data: {
              userId: order.userId,
              type:   'order',
              title:  'Votre avis nous intéresse ⭐',
              body:   `Commande ${order.orderNumber} livrée — notez vos produits et notre service.`,
              link:   `/avis/${token}`,
            },
          })
        : Promise.resolve(),
    ])
  } catch (err) {
    logger.error('[orderReview] échec demande d\'avis', orderId, err)
  }
}
