"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDealAnnouncement = processDealAnnouncement;
exports.processDueDealAnnouncements = processDueDealAnnouncements;
const prisma_1 = require("./prisma");
const email_1 = require("./email");
async function resolveRecipients(segment, productIds, inactiveDays) {
    const base = { isBanned: false, subscribedToNewsletter: true };
    if (segment === 'buyers') {
        return prisma_1.prisma.user.findMany({
            where: { ...base, orders: { some: { items: { some: { productId: { in: productIds } } } } } },
            select: { id: true, prenom: true, email: true },
        });
    }
    if (segment === 'inactive') {
        const cutoff = new Date(Date.now() - (inactiveDays ?? 30) * 86_400_000);
        return prisma_1.prisma.user.findMany({
            where: { ...base, orders: { none: { createdAt: { gte: cutoff } } } },
            select: { id: true, prenom: true, email: true },
        });
    }
    return prisma_1.prisma.user.findMany({ where: base, select: { id: true, prenom: true, email: true } });
}
/** Envoie (ou marque en échec) une annonce de vente flash déjà enregistrée en base. */
async function processDealAnnouncement(id) {
    const announcement = await prisma_1.prisma.dealAnnouncement.findUnique({ where: { id } });
    if (!announcement || announcement.status !== 'pending')
        return;
    try {
        const productIds = JSON.parse(announcement.productIds);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, salePrice: { not: null } },
            include: { images: { take: 1, orderBy: { position: 'asc' } } },
        });
        if (products.length === 0) {
            await prisma_1.prisma.dealAnnouncement.update({
                where: { id }, data: { status: 'failed', error: 'Aucun produit en promo trouvé', sentAt: new Date() },
            });
            return;
        }
        const dealProducts = products.map(p => ({
            id: p.id, name: p.name, image: p.images[0]?.url ?? '', price: p.price, salePrice: p.salePrice,
        }));
        const latestEndsAt = products.reduce((max, p) => (p.saleEndsAt && p.saleEndsAt > max ? p.saleEndsAt : max), new Date(0));
        const recipients = await resolveRecipients(announcement.segment, productIds, announcement.inactiveDays);
        const results = await Promise.allSettled(recipients.map(u => (0, email_1.sendFlashDealEmail)(u.email, u.prenom, dealProducts, latestEndsAt)));
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0)
            console.error(`[deal-announcement ${id}] ${failed}/${recipients.length} envois échoués`);
        await prisma_1.prisma.dealAnnouncement.update({
            where: { id },
            data: { status: 'sent', sentAt: new Date(), recipientCount: recipients.length },
        });
    }
    catch (err) {
        await prisma_1.prisma.dealAnnouncement.update({
            where: { id }, data: { status: 'failed', error: err instanceof Error ? err.message : 'Erreur inconnue', sentAt: new Date() },
        });
    }
}
/** Poller — envoie les annonces programmées dont l'heure est arrivée. À appeler périodiquement. */
async function processDueDealAnnouncements() {
    const due = await prisma_1.prisma.dealAnnouncement.findMany({
        where: { status: 'pending', sendAt: { lte: new Date() } },
        select: { id: true },
    });
    for (const { id } of due)
        await processDealAnnouncement(id);
}
//# sourceMappingURL=dealAnnouncements.js.map