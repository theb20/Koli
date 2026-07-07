"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/* GET /api/seller/me — infos de ma boutique */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const store = await prisma_1.prisma.sellerStore.findUnique({
            where: { userId: req.user.userId },
            include: {
                products: {
                    include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
                },
            },
        });
        res.json({ success: true, data: { store } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* POST /api/seller/register — créer ma boutique */
router.post('/register', auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z.object({
            name: zod_1.z.string().min(2).max(80),
            description: zod_1.z.string().max(500).optional(),
            phone: zod_1.z.string().optional(),
            address: zod_1.z.string().optional(),
        }).parse(req.body);
        const existing = await prisma_1.prisma.sellerStore.findUnique({ where: { userId: req.user.userId } });
        if (existing) {
            res.status(409).json({ success: false, message: 'Vous avez déjà une boutique.' });
            return;
        }
        const store = await prisma_1.prisma.sellerStore.create({
            data: { userId: req.user.userId, ...body },
        });
        // Passer le rôle en "seller"
        await prisma_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { role: 'seller' },
        });
        res.status(201).json({ success: true, data: { store } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* PATCH /api/seller/me — mettre à jour ma boutique */
router.patch('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z.object({
            name: zod_1.z.string().min(2).max(80).optional(),
            description: zod_1.z.string().max(500).optional(),
            logo: zod_1.z.string().optional(),
            banner: zod_1.z.string().optional(),
            phone: zod_1.z.string().optional(),
            address: zod_1.z.string().optional(),
        }).parse(req.body);
        const store = await prisma_1.prisma.sellerStore.update({
            where: { userId: req.user.userId },
            data: body,
        });
        res.json({ success: true, data: { store } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* GET /api/seller/stats — revenus + commandes */
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const store = await prisma_1.prisma.sellerStore.findUnique({ where: { userId: req.user.userId } });
        if (!store) {
            res.status(404).json({ success: false, message: 'Boutique introuvable.' });
            return;
        }
        const sellerProducts = await prisma_1.prisma.sellerProduct.findMany({
            where: { storeId: store.id },
            select: { productId: true, commission: true },
        });
        const productIds = sellerProducts.map(p => p.productId);
        const orderItems = await prisma_1.prisma.orderItem.findMany({
            where: { productId: { in: productIds } },
            include: { order: { select: { status: true, createdAt: true } } },
        });
        const revenue = Math.round(orderItems
            .filter(i => i.order.status === 'delivered')
            .reduce((s, i) => {
            const sp = sellerProducts.find(p => p.productId === i.productId);
            const commission = sp?.commission ?? 5;
            return s + i.price * i.qty * (1 - commission / 100);
        }, 0));
        const totalOrders = new Set(orderItems.map(i => i.orderId)).size;
        res.json({
            success: true,
            data: {
                revenue,
                totalOrders,
                totalProducts: productIds.length,
                isApproved: store.isApproved,
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=seller.js.map