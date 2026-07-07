import { prisma } from './prisma'
import { sendFlashDealEmail, type FlashDealProduct } from './email'

export type DealSegment = 'all' | 'buyers' | 'inactive'

async function resolveRecipients(segment: DealSegment, productIds: number[], inactiveDays: number | null) {
  const base = { isBanned: false, subscribedToNewsletter: true }

  if (segment === 'buyers') {
    return prisma.user.findMany({
      where: { ...base, orders: { some: { items: { some: { productId: { in: productIds } } } } } },
      select: { id: true, prenom: true, email: true },
    })
  }

  if (segment === 'inactive') {
    const cutoff = new Date(Date.now() - (inactiveDays ?? 30) * 86_400_000)
    return prisma.user.findMany({
      where: { ...base, orders: { none: { createdAt: { gte: cutoff } } } },
      select: { id: true, prenom: true, email: true },
    })
  }

  return prisma.user.findMany({ where: base, select: { id: true, prenom: true, email: true } })
}

/** Envoie (ou marque en échec) une annonce de vente flash déjà enregistrée en base. */
export async function processDealAnnouncement(id: number): Promise<void> {
  const announcement = await prisma.dealAnnouncement.findUnique({ where: { id } })
  if (!announcement || announcement.status !== 'pending') return

  try {
    const productIds: number[] = JSON.parse(announcement.productIds)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, salePrice: { not: null } },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    })

    if (products.length === 0) {
      await prisma.dealAnnouncement.update({
        where: { id }, data: { status: 'failed', error: 'Aucun produit en promo trouvé', sentAt: new Date() },
      })
      return
    }

    const dealProducts: FlashDealProduct[] = products.map(p => ({
      id: p.id, name: p.name, image: p.images[0]?.url ?? '', price: p.price, salePrice: p.salePrice!,
    }))
    const latestEndsAt = products.reduce<Date>((max, p) => (p.saleEndsAt && p.saleEndsAt > max ? p.saleEndsAt : max), new Date(0))

    const recipients = await resolveRecipients(announcement.segment as DealSegment, productIds, announcement.inactiveDays)

    const results = await Promise.allSettled(
      recipients.map(u => sendFlashDealEmail(u.email, u.prenom, dealProducts, latestEndsAt)),
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) console.error(`[deal-announcement ${id}] ${failed}/${recipients.length} envois échoués`)

    await prisma.dealAnnouncement.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), recipientCount: recipients.length },
    })
  } catch (err) {
    await prisma.dealAnnouncement.update({
      where: { id }, data: { status: 'failed', error: err instanceof Error ? err.message : 'Erreur inconnue', sentAt: new Date() },
    })
  }
}

/** Poller — envoie les annonces programmées dont l'heure est arrivée. À appeler périodiquement. */
export async function processDueDealAnnouncements(): Promise<void> {
  const due = await prisma.dealAnnouncement.findMany({
    where: { status: 'pending', sendAt: { lte: new Date() } },
    select: { id: true },
  })
  for (const { id } of due) await processDealAnnouncement(id)
}
