"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const reviewSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    rating: zod_1.z.number().int().min(1).max(5),
    title: zod_1.z.string().max(100).optional(),
    body: zod_1.z.string().min(10, 'Minimum 10 caractères').max(2000),
});
/* ── GET /api/reviews/latest  — derniers avis publics ─────── */
router.get('/latest', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query['limit']) || 6, 20);
        const reviews = await prisma_1.prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { prenom: true, nom: true, avatar: true } },
                product: { select: { name: true } },
            },
        });
        res.json({ success: true, data: { reviews } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/reviews/product/:id ─────────────────────────── */
router.get('/product/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params['id'] ?? '');
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 10;
        const [total, reviews, stats] = await Promise.all([
            prisma_1.prisma.review.count({ where: { productId } }),
            prisma_1.prisma.review.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { prenom: true, nom: true, avatar: true } },
                },
            }),
            // Statistiques de notation
            prisma_1.prisma.review.groupBy({
                by: ['rating'],
                where: { productId },
                _count: { rating: true },
            }),
        ]);
        const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
            stars: r,
            count: stats.find(s => s.rating === r)?._count.rating ?? 0,
        }));
        const avgRating = total > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / total
            : 0;
        res.json({
            success: true,
            data: {
                reviews,
                stats: { total, avgRating: Math.round(avgRating * 10) / 10, ratingDistribution },
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/reviews ─────────────────────────────────────── */
/* Plusieurs avis autorisés par utilisateur par produit         */
router.post('/', auth_1.requireAuth, (0, validate_1.validate)(reviewSchema), async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.userId;
        // Vérifier si achat vérifié
        const hasBought = await prisma_1.prisma.orderItem.findFirst({
            where: { productId: data.productId, order: { userId, status: 'delivered' } },
        });
        const review = await prisma_1.prisma.review.create({
            data: { ...data, userId, verified: !!hasBought },
            include: { user: { select: { prenom: true, nom: true, avatar: true } } },
        });
        // Recalculer la note moyenne du produit
        const agg = await prisma_1.prisma.review.aggregate({
            where: { productId: data.productId },
            _avg: { rating: true },
            _count: { rating: true },
        });
        await prisma_1.prisma.product.update({
            where: { id: data.productId },
            data: {
                rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
                reviews: agg._count.rating,
            },
        });
        res.status(201).json({ success: true, data: review });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/reviews/:id — Modifier son avis ──────────────── */
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const schema = zod_1.z.object({
            rating: zod_1.z.number().int().min(1).max(5).optional(),
            title: zod_1.z.string().max(100).optional(),
            body: zod_1.z.string().min(10).max(2000).optional(),
        });
        const data = schema.parse(req.body);
        const review = await prisma_1.prisma.review.findFirst({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        if (!review) {
            res.status(404).json({ success: false, message: 'Avis introuvable' });
            return;
        }
        const updated = await prisma_1.prisma.review.update({ where: { id: review.id }, data });
        res.json({ success: true, data: updated });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/reviews/:id ───────────────────────────────── */
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const review = await prisma_1.prisma.review.findFirst({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        if (!review) {
            res.status(404).json({ success: false, message: 'Avis introuvable' });
            return;
        }
        await prisma_1.prisma.review.delete({ where: { id: review.id } });
        // Recalculer la note
        const agg = await prisma_1.prisma.review.aggregate({
            where: { productId: review.productId },
            _avg: { rating: true }, _count: { rating: true },
        });
        await prisma_1.prisma.product.update({
            where: { id: review.productId },
            data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviews: agg._count.rating },
        });
        res.json({ success: true, message: 'Avis supprimé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/reviews/:id/helpful ────────────────────────── */
router.post('/:id/helpful', async (req, res) => {
    try {
        await prisma_1.prisma.review.update({
            where: { id: req.params['id'] },
            data: { helpful: { increment: 1 } },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/reviews/admin/all  [ADMIN] ───────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const [total, reviews] = await Promise.all([
            prisma_1.prisma.review.count(),
            prisma_1.prisma.review.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
                include: {
                    product: { select: { name: true } },
                    user: { select: { prenom: true, nom: true } },
                },
            }),
        ]);
        res.json({ success: true, data: { reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map