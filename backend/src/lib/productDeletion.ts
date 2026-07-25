import { prisma } from './prisma'
import { deleteFromStockgo } from './stockgo'
import { deleteLocalUpload } from './deleteLocalUpload'
import { logger } from './logger'

/**
 * Suppression "atomique" d'un produit : jamais un simple `isActive: false`
 * sans discernement, ni un DELETE aveugle qui échouerait silencieusement.
 *
 * - Produit jamais commandé → suppression définitive. Les lignes liées
 *   (ProductImage, ProductSpec, WishlistItem, StockAlert, GiftListItem,
 *   BrowseHistory, Review, SellerProduct) partent en cascade (Prisma/DB,
 *   voir schema.prisma) ; les fichiers image sont ensuite purgés du
 *   stockage (stockgo ou uploads/ locaux) — Prisma ne nettoie que les
 *   lignes, jamais les fichiers physiques.
 * - Produit déjà commandé au moins une fois → OrderItem.product n'a
 *   volontairement PAS de cascade (schema.prisma) : l'historique de
 *   commande doit survivre à la suppression d'un produit. Un DELETE
 *   échouerait avec une violation de clé étrangère (P2003) — on bascule
 *   donc sur une désactivation (isActive: false), qui retire déjà le
 *   produit de la vente sans casser l'historique.
 */
export async function deleteProductAtomic(id: number): Promise<'hard' | 'soft'> {
  const hasOrders = await prisma.orderItem.findFirst({ where: { productId: id }, select: { id: true } })

  if (hasOrders) {
    await prisma.product.update({ where: { id }, data: { isActive: false } })
    return 'soft'
  }

  const images = await prisma.productImage.findMany({
    where: { productId: id },
    select: { url: true, thumbnailUrl: true },
  })

  await prisma.product.delete({ where: { id } })

  // Best-effort, après coup : le produit est déjà supprimé en base, un échec
  // de nettoyage de fichier ne doit jamais faire remonter d'erreur au client.
  for (const img of images) {
    for (const url of [img.url, img.thumbnailUrl].filter((u): u is string => !!u)) {
      deleteFromStockgo(url).catch(err => logger.error('[deleteProductAtomic] échec purge stockgo', url, err))
      try { deleteLocalUpload(url) } catch (err) { logger.error('[deleteProductAtomic] échec purge locale', url, err) }
    }
  }

  return 'hard'
}
