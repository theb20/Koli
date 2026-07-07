"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/* POST /api/history — enregistrer une vue produit */
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { productId } = zod_1.z.object({ productId: zod_1.z.number().int().positive() }).parse(req.body);
        await prisma_1.prisma.browseHistory.upsert({
            where: { userId_productId: { userId: req.user.userId, productId } },
            update: { viewedAt: new Date() },
            create: { userId: req.user.userId, productId },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* GET /api/history — mes produits récemment consultés */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const items = await prisma_1.prisma.browseHistory.findMany({
            where: { userId: req.user.userId },
            orderBy: { viewedAt: 'desc' },
            take: 12,
            include: {
                product: {
                    include: { images: { take: 1, orderBy: { position: 'asc' } } },
                },
            },
        });
        const products = items
            .filter(i => i.product.isActive)
            .map(i => i.product);
        res.json({ success: true, data: { products } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* DELETE /api/history — vider l'historique */
router.delete('/', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.browseHistory.deleteMany({ where: { userId: req.user.userId } });
        res.json({ success: true, message: 'Historique effacé.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=history.js.map