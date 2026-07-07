"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
/* GET /api/flash — produits en vente flash actives */
router.get('/', async (_req, res) => {
    try {
        const now = new Date();
        const products = await prisma_1.prisma.product.findMany({
            where: {
                isActive: true,
                saleEndsAt: { gt: now },
                salePrice: { not: null },
            },
            include: {
                images: { orderBy: { position: 'asc' }, take: 1 },
            },
            orderBy: { saleEndsAt: 'asc' },
        });
        res.json({ success: true, data: { products } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=flash.js.map