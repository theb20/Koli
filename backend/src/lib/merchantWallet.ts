/* ─────────────────────────────────────────────────────────────
   Notifie merchantgo (commission/portefeuille) quand une commande passe
   réellement payée — jamais à la simple confirmation de statut pour une
   commande en ligne (voir memory: order-payment-architecture). Une seule
   commande peut mélanger plusieurs marchands ; chacun n'est crédité que
   sur SA part (jamais le total de la commande).
───────────────────────────────────────────────────────────── */
import { prisma } from './prisma'
import { logger } from './logger'
import { isMerchantgoConfigured, recordMerchantSale, recordMerchantRefund } from './merchantgo'

export async function notifyMerchantsOrderPaid(orderId: string, orderNumber: string): Promise<void> {
  if (!isMerchantgoConfigured()) return // dev sans merchantgo configuré — non bloquant

  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { price: true, qty: true, product: { select: { storeId: true } } },
    })

    const storeIds = [...new Set(items.map(i => i.product.storeId).filter((id): id is number => id != null))]
    if (storeIds.length === 0) return

    const stores = await prisma.sellerStore.findMany({
      where:  { id: { in: storeIds } },
      select: { id: true, userId: true },
    })

    await Promise.allSettled(stores.map(store => {
      const gross = items
        .filter(i => i.product.storeId === store.id)
        .reduce((sum, i) => sum + i.price * i.qty, 0)
      if (gross <= 0) return Promise.resolve()

      return recordMerchantSale({ userId: store.userId, orderId, orderNumber, grossAmount: gross })
        .catch(err => logger.error('[merchantWallet] échec enregistrement vente', orderId, store.id, err))
    }))
  } catch (err) {
    logger.error('[merchantWallet] échec notifyMerchantsOrderPaid', orderId, err)
  }
}

/**
 * Reprend au(x) marchand(s) concerné(s) leur part du crédit déjà reçu pour
 * les articles d'UN retour précis (pas toute la commande — un retour peut
 * être partiel) — appelée dès qu'un OrderReturn passe "refunded", que ce
 * soit la transition manuelle admin (returns.ts) ou automatique via le
 * webhook GeniusPay (internal.ts, mark-refunded). Même base de calcul que
 * notifyMerchantsOrderPaid (price × qty par article, HT, jamais le
 * refundAmount TTC/proraté affiché au client) pour que le débit soit
 * symétrique au crédit d'origine.
 */
export async function notifyMerchantsOrderRefunded(returnId: string): Promise<void> {
  if (!isMerchantgoConfigured()) return

  try {
    const ret = await prisma.orderReturn.findUnique({
      where: { id: returnId },
      select: {
        order: { select: { id: true, orderNumber: true } },
        items: {
          select: {
            quantity: true,
            orderItem: { select: { price: true, product: { select: { storeId: true } } } },
          },
        },
      },
    })
    if (!ret) return

    const storeIds = [...new Set(ret.items.map(i => i.orderItem.product.storeId).filter((id): id is number => id != null))]
    if (storeIds.length === 0) return

    const stores = await prisma.sellerStore.findMany({
      where:  { id: { in: storeIds } },
      select: { id: true, userId: true },
    })

    await Promise.allSettled(stores.map(store => {
      const gross = ret.items
        .filter(i => i.orderItem.product.storeId === store.id)
        .reduce((sum, i) => sum + i.orderItem.price * i.quantity, 0)
      if (gross <= 0) return Promise.resolve()

      return recordMerchantRefund({ userId: store.userId, orderId: ret.order.id, orderNumber: ret.order.orderNumber, returnId, grossAmount: gross })
        .catch(err => logger.error('[merchantWallet] échec débit remboursement', returnId, store.id, err))
    }))
  } catch (err) {
    logger.error('[merchantWallet] échec notifyMerchantsOrderRefunded', returnId, err)
  }
}
