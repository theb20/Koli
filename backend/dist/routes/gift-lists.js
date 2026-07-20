"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const zListItemParams = zod_1.z.object({
    id: zod_1.z.string().min(1).max(40),
    productId: zod_1.z.coerce.number().int().positive('ID produit invalide'),
});
const router = (0, express_1.Router)();
function generateSlug(userId) {
    return `liste-${userId.slice(-8)}-${Date.now().toString(36)}`;
}
/* GET /api/gift-lists — mes listes */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const lists = await prisma_1.prisma.giftList.findMany({
            where: { userId: req.user.userId },
            include: {
                items: {
                    include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: { lists } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* GET /api/gift-lists/:slug — liste publique */
router.get('/:slug', (0, validate_1.validateParams)(validate_1.zSlugParam), async (req, res) => {
    try {
        const list = await prisma_1.prisma.giftList.findUnique({
            where: { slug: req.params['slug'] },
            include: {
                user: { select: { prenom: true, nom: true, avatar: true } },
                items: {
                    include: {
                        product: {
                            include: { images: { take: 1, orderBy: { position: 'asc' } } },
                        },
                    },
                },
            },
        });
        if (!list || (!list.isPublic)) {
            res.status(404).json({ success: false, message: 'Liste introuvable.' });
            return;
        }
        res.json({ success: true, data: { list } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* POST /api/gift-lists — créer une liste */
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z.object({
            title: zod_1.z.string().min(2).max(80),
            occasion: zod_1.z.string().optional(),
            date: zod_1.z.string().optional(),
            isPublic: zod_1.z.boolean().default(true),
        }).parse(req.body);
        const list = await prisma_1.prisma.giftList.create({
            data: {
                userId: req.user.userId,
                title: body.title,
                slug: generateSlug(req.user.userId),
                occasion: body.occasion,
                date: body.date ? new Date(body.date) : undefined,
                isPublic: body.isPublic,
            },
        });
        res.status(201).json({ success: true, data: { list } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* POST /api/gift-lists/:id/items — ajouter un produit */
router.post('/:id/items', auth_1.requireAuth, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        const { productId } = zod_1.z.object({ productId: zod_1.z.number().int().positive() }).parse(req.body);
        const list = await prisma_1.prisma.giftList.findFirst({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        if (!list) {
            res.status(404).json({ success: false, message: 'Liste introuvable.' });
            return;
        }
        await prisma_1.prisma.giftListItem.upsert({
            where: { listId_productId: { listId: list.id, productId } },
            update: {},
            create: { listId: list.id, productId },
        });
        res.json({ success: true, message: 'Produit ajouté à la liste.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* DELETE /api/gift-lists/:id/items/:productId */
router.delete('/:id/items/:productId', auth_1.requireAuth, (0, validate_1.validateParams)(zListItemParams), async (req, res) => {
    try {
        const productId = Number(req.params['productId']);
        const list = await prisma_1.prisma.giftList.findFirst({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        if (!list) {
            res.status(404).json({ success: false, message: 'Liste introuvable.' });
            return;
        }
        await prisma_1.prisma.giftListItem.deleteMany({
            where: { listId: list.id, productId },
        });
        res.json({ success: true, message: 'Produit retiré.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* DELETE /api/gift-lists/:id */
router.delete('/:id', auth_1.requireAuth, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        await prisma_1.prisma.giftList.deleteMany({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        res.json({ success: true, message: 'Liste supprimée.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* PATCH /api/gift-lists/:id/items/:productId/purchased — accessible sans
   compte (un proche marque un cadeau comme acheté depuis le lien partagé),
   mais uniquement sur une liste explicitement publique. */
router.patch('/:id/items/:productId/purchased', (0, validate_1.validateParams)(zListItemParams), async (req, res) => {
    try {
        const productId = Number(req.params['productId']);
        const { isPurchased } = zod_1.z.object({ isPurchased: zod_1.z.boolean() }).parse(req.body);
        const list = await prisma_1.prisma.giftList.findFirst({
            where: { id: req.params['id'], isPublic: true },
        });
        if (!list) {
            res.status(404).json({ success: false, message: 'Liste introuvable.' });
            return;
        }
        await prisma_1.prisma.giftListItem.updateMany({
            where: { listId: list.id, productId },
            data: { isPurchased },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=gift-lists.js.map