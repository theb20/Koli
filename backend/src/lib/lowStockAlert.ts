import { prisma } from './prisma'
import { sendLowStockAlertEmail } from './mailer'
import { logger } from './logger'

/**
 * À appeler après toute décrémentation de stock (commande payée) sur un
 * produit ou une variante — jamais après une restitution (retour stock sur
 * annulation), qui ne peut qu'améliorer la situation.
 *
 * Opt-in par boutique (SellerStore.lowStockThreshold) : un produit sans
 * boutique (storeId null, catalogue Skignas) ou une boutique sans seuil
 * réglé ne déclenche jamais rien. Un seul e-mail par passage sous le seuil
 * (lowStockAlertedAt posé) — remis à zéro dès que le stock repasse
 * au-dessus, pour qu'une rupture future réalerte. Jamais bloquant pour
 * l'appelant (commande) : toute erreur est juste loguée.
 */
export async function checkLowStockAndAlert(productId: number, variantId: number | null): Promise<void> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true, stock: true, lowStockAlertedAt: true,
        store: { select: { lowStockThreshold: true, user: { select: { email: true } } } },
      },
    })
    if (!product?.store || product.store.lowStockThreshold == null) return
    const threshold = product.store.lowStockThreshold
    const to = product.store.user.email

    if (variantId != null) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { name: true, stock: true, lowStockAlertedAt: true },
      })
      if (!variant) return
      await applyAlertState('productVariant', variantId, variant.stock, variant.lowStockAlertedAt, threshold, to, product.name, variant.name)
      return
    }

    await applyAlertState('product', productId, product.stock, product.lowStockAlertedAt, threshold, to, product.name, null)
  } catch (err) {
    logger.error('[lowStockAlert] échec de la vérification', productId, variantId, err)
  }
}

async function applyAlertState(
  model: 'product' | 'productVariant',
  id: number,
  stock: number,
  alertedAt: Date | null,
  threshold: number,
  to: string,
  productName: string,
  variantName: string | null,
): Promise<void> {
  if (stock > threshold) {
    if (alertedAt) {
      if (model === 'product') await prisma.product.update({ where: { id }, data: { lowStockAlertedAt: null } })
      else await prisma.productVariant.update({ where: { id }, data: { lowStockAlertedAt: null } })
    }
    return
  }

  if (alertedAt) return // déjà alerté pour cette rupture, pas de rappel à chaque commande

  if (model === 'product') await prisma.product.update({ where: { id }, data: { lowStockAlertedAt: new Date() } })
  else await prisma.productVariant.update({ where: { id }, data: { lowStockAlertedAt: new Date() } })

  await sendLowStockAlertEmail(to, { productName, variantName, stock, threshold })
}
