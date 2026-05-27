"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/* ── GET /api/wishlist ──────────────────────────────────────── */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const items = await prisma_1.prisma.wishlistItem.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                product: {
                    include: { images: { take: 1, orderBy: { position: 'asc' } } },
                },
            },
        });
        res.json({ success: true, data: items });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/wishlist/:productId — Ajouter ─────────────────── */
router.post('/:productId', auth_1.requireAuth, async (req, res) => {
    try {
        const productId = parseInt(req.params['productId'] ?? '');
        if (isNaN(productId)) {
            res.status(400).json({ success: false, message: 'ID invalide' });
            return;
        }
        const product = await prisma_1.prisma.product.findFirst({ where: { id: productId, isActive: true } });
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit introuvable' });
            return;
        }
        // upsert — pas d'erreur si déjà dans la wishlist
        await prisma_1.prisma.wishlistItem.upsert({
            where: { userId_productId: { userId: req.user.userId, productId } },
            create: { userId: req.user.userId, productId },
            update: {},
        });
        res.status(201).json({ success: true, message: 'Ajouté aux favoris' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/wishlist/:productId — Supprimer ─────────────── */
router.delete('/:productId', auth_1.requireAuth, async (req, res) => {
    try {
        const productId = parseInt(req.params['productId'] ?? '');
        if (isNaN(productId)) {
            res.status(400).json({ success: false, message: 'ID invalide' });
            return;
        }
        await prisma_1.prisma.wishlistItem.deleteMany({
            where: { userId: req.user.userId, productId },
        });
        res.json({ success: true, message: 'Retiré des favoris' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/wishlist — Vider tout ─────────────────────── */
router.delete('/', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.wishlistItem.deleteMany({ where: { userId: req.user.userId } });
        res.json({ success: true, message: 'Favoris vidés' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=wishlist.js.map