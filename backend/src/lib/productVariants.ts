import { prisma } from './prisma'

/**
 * Maintient Product.stock comme miroir d'affichage (badge "en stock"/rupture
 * sur le catalogue, filtres existants) quand le produit a des variantes —
 * somme des stocks des variantes actives. Appelé après chaque mutation de
 * variante (création/édition/suppression) ; la décrémentation réelle à la
 * commande se fait directement sur ProductVariant.stock (voir routes/orders.ts),
 * ce miroir reste best-effort, jamais le garde-fou contre la survente.
 * Ne touche rien si le produit n'a aucune variante (stock resté géré
 * directement par le marchand, comme avant les variantes).
 */
export async function syncProductStockFromVariants(productId: number): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    where: { productId, isActive: true },
    select: { stock: true },
  })
  if (variants.length === 0) return
  const total = variants.reduce((sum, v) => sum + v.stock, 0)
  await prisma.product.update({ where: { id: productId }, data: { stock: total } })
}
