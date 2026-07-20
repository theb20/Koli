"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const dealAnnouncements_1 = require("../lib/dealAnnouncements");
const logger_1 = require("../lib/logger");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    productIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1),
    segment: zod_1.z.enum(['all', 'buyers', 'inactive']),
    inactiveDays: zod_1.z.number().int().positive().optional(),
    sendAt: zod_1.z.coerce.date().optional(), // absent/passé = envoi immédiat
});
/* ── GET /api/deal-announcements  [ADMIN] — historique ─────────── */
router.get('/', auth_1.requireAdmin, async (_req, res) => {
    try {
        const announcements = await prisma_1.prisma.dealAnnouncement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        res.json({
            success: true,
            data: announcements.map(a => ({ ...a, productIds: JSON.parse(a.productIds) })),
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/deal-announcements  [ADMIN] ──────────────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(createSchema), async (req, res) => {
    try {
        const { productIds, segment, inactiveDays, sendAt } = req.body;
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, salePrice: { not: null } },
            select: { id: true },
        });
        if (products.length === 0) {
            res.status(400).json({ success: false, message: 'Aucun des produits sélectionnés n\'a de promo active ou programmée' });
            return;
        }
        const effectiveSendAt = sendAt ?? new Date();
        const announcement = await prisma_1.prisma.dealAnnouncement.create({
            data: {
                productIds: JSON.stringify(productIds),
                segment,
                inactiveDays: segment === 'inactive' ? (inactiveDays ?? 30) : null,
                sendAt: effectiveSendAt,
            },
        });
        if (effectiveSendAt <= new Date()) {
            (0, dealAnnouncements_1.processDealAnnouncement)(announcement.id).catch(err => logger_1.logger.error('[deal-announcement] envoi immédiat échoué', err));
        }
        res.status(201).json({ success: true, data: { ...announcement, productIds } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/deal-announcements/:id  [ADMIN] — annule une annonce programmée ── */
router.delete('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), async (req, res) => {
    try {
        const id = Number(req.params['id']);
        const updated = await prisma_1.prisma.dealAnnouncement.updateMany({
            where: { id, status: 'pending' },
            data: { status: 'cancelled' },
        });
        if (updated.count === 0) {
            res.status(400).json({ success: false, message: 'Cette annonce ne peut plus être annulée' });
            return;
        }
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=deal-announcements.js.map