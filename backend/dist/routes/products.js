"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const router = (0, express_1.Router)();
/* ── Schemas ─────────────────────────────────────────────────── */
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(20),
    category: zod_1.z.string().optional(),
    q: zod_1.z.string().optional(),
    sort: zod_1.z.enum(['popular', 'newest', 'price_asc', 'price_desc', 'rating']).default('popular'),
    minPrice: zod_1.z.coerce.number().int().optional(),
    maxPrice: zod_1.z.coerce.number().int().optional(),
    badge: zod_1.z.string().optional(),
    inStock: zod_1.z.coerce.boolean().optional(),
    storeId: zod_1.z.coerce.number().int().optional(), // filter by store
    hasSale: zod_1.z.coerce.boolean().optional(), // filter: promo programmée (salePrice défini)
});
const createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(200),
    brand: zod_1.z.string().min(1).max(100),
    category: zod_1.z.string().min(1, 'Catégorie requise'),
    price: zod_1.z.number().int().positive(),
    oldPrice: zod_1.z.number().int().positive().optional(),
    badge: zod_1.z.enum(['hot', 'new', 'sale', 'top']).optional(),
    stock: zod_1.z.number().int().nonnegative().default(100),
    isNew: zod_1.z.boolean().default(false),
    description: zod_1.z.string().optional(),
    colors: zod_1.z.array(zod_1.z.string()).optional(),
    images: zod_1.z.array(zod_1.z.string().url()).min(1).max(4),
    specs: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), value: zod_1.z.string() })).optional(),
    /* Promo programmée (Deals du jour / vente flash) */
    salePrice: zod_1.z.number().int().positive().nullable().optional(),
    saleStartsAt: zod_1.z.coerce.date().nullable().optional(),
    saleEndsAt: zod_1.z.coerce.date().nullable().optional(),
});
/** Cohérence de la promo — appliquée à la création ET à l'édition */
function saleWindowError(d) {
    if (d.salePrice != null && !d.saleEndsAt)
        return 'Une date de fin est requise pour programmer un prix promo';
    if (d.saleStartsAt && d.saleEndsAt && d.saleStartsAt >= d.saleEndsAt)
        return 'La date de fin doit être après la date de début';
    return null;
}
const createProductSchemaChecked = createProductSchema.superRefine((d, ctx) => {
    const err = saleWindowError(d);
    if (err)
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: err, path: ['saleEndsAt'] });
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products
───────────────────────────────────────────────────────────── */
router.get('/', auth_1.optionalAuth, (0, cache_1.cacheControl)(30), async (req, res) => {
    try {
        const query = listQuerySchema.parse(req.query);
        const { page, limit, category, q, sort, minPrice, maxPrice, badge, inStock, storeId, hasSale } = query;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where = { isActive: true };
        if (category)
            where['category'] = category;
        if (badge)
            where['badge'] = badge;
        if (inStock)
            where['stock'] = { gt: 0 };
        if (storeId)
            where['storeId'] = storeId;
        if (hasSale)
            where['salePrice'] = { not: null };
        if (minPrice !== undefined || maxPrice !== undefined) {
            where['price'] = {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            };
        }
        if (q) {
            where['OR'] = [
                { name: { contains: q } },
                { brand: { contains: q } },
                { description: { contains: q } },
            ];
        }
        const orderBy = (() => {
            switch (sort) {
                case 'newest': return { createdAt: 'desc' };
                case 'price_asc': return { price: 'asc' };
                case 'price_desc': return { price: 'desc' };
                case 'rating': return { rating: 'desc' };
                default: return { sold: 'desc' };
            }
        })();
        const [total, products] = await Promise.all([
            prisma_1.prisma.product.count({ where }),
            prisma_1.prisma.product.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    images: { orderBy: { position: 'asc' } },
                    store: { select: { id: true, name: true } },
                    categoryRel: { select: { id: true, slug: true, name: true, icon: true, image: true } },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page, limit, total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: 'Paramètres invalides', errors: err.flatten().fieldErrors });
            return;
        }
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products/featured   — produits mis en avant (homepage)
───────────────────────────────────────────────────────────── */
router.get('/featured', (0, cache_1.cacheControl)(60), async (_req, res) => {
    try {
        const [hot, newItems, topRated] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where: { badge: 'hot', isActive: true },
                take: 8, orderBy: { sold: 'desc' },
                include: { images: { take: 1, orderBy: { position: 'asc' } } },
            }),
            prisma_1.prisma.product.findMany({
                where: { isNew: true, isActive: true },
                take: 8, orderBy: { createdAt: 'desc' },
                include: { images: { take: 1, orderBy: { position: 'asc' } } },
            }),
            prisma_1.prisma.product.findMany({
                where: { rating: { gte: 4.5 }, isActive: true },
                take: 8, orderBy: { rating: 'desc' },
                include: { images: { take: 1, orderBy: { position: 'asc' } } },
            }),
        ]);
        res.json({ success: true, data: { hot, new: newItems, topRated } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products/:id
───────────────────────────────────────────────────────────── */
router.get('/:id', auth_1.optionalAuth, (0, cache_1.cacheControl)(20), async (req, res) => {
    try {
        const id = parseInt(req.params['id'] ?? '');
        if (isNaN(id)) {
            res.status(400).json({ success: false, message: 'ID invalide' });
            return;
        }
        const product = await prisma_1.prisma.product.findFirst({
            where: { id, isActive: true },
            include: {
                images: { orderBy: { position: 'asc' } },
                specs: { orderBy: { position: 'asc' } },
                categoryRel: { select: { id: true, slug: true, name: true, icon: true, image: true } },
                reviewItems: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { prenom: true, nom: true, avatar: true } } },
                },
            },
        });
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit introuvable' });
            return;
        }
        // Produits similaires + statut wishlist — indépendants, en parallèle
        const [similar, wish] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where: { category: product.category, id: { not: product.id }, isActive: true },
                take: 6, orderBy: { sold: 'desc' },
                include: { images: { take: 1, orderBy: { position: 'asc' } } },
            }),
            req.user
                ? prisma_1.prisma.wishlistItem.findUnique({
                    where: { userId_productId: { userId: req.user.userId, productId: id } },
                })
                : Promise.resolve(null),
        ]);
        res.json({ success: true, data: { product, similar, inWishlist: !!wish } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/products/bulk-sale  [ADMIN]
   Programme (ou retire) la même promo sur plusieurs produits d'un coup.
───────────────────────────────────────────────────────────── */
const bulkSaleSchema = zod_1.z.object({
    productIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1),
    salePrice: zod_1.z.number().int().positive().nullable(),
    saleStartsAt: zod_1.z.coerce.date().nullable().optional(),
    saleEndsAt: zod_1.z.coerce.date().nullable().optional(),
});
router.post('/bulk-sale', auth_1.requireAdmin, (0, validate_1.validate)(bulkSaleSchema), async (req, res) => {
    try {
        const { productIds, salePrice, saleStartsAt, saleEndsAt } = req.body;
        if (salePrice !== null) {
            const err = saleWindowError({ salePrice, saleStartsAt: saleStartsAt ?? null, saleEndsAt: saleEndsAt ?? null });
            if (err) {
                res.status(400).json({ success: false, message: err });
                return;
            }
        }
        await prisma_1.prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: {
                salePrice,
                saleStartsAt: salePrice === null ? null : (saleStartsAt ?? null),
                saleEndsAt: salePrice === null ? null : (saleEndsAt ?? null),
            },
        });
        res.json({ success: true, data: { updated: productIds.length } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/products  [ADMIN]
───────────────────────────────────────────────────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(createProductSchemaChecked), async (req, res) => {
    try {
        const { images, specs, colors, ...data } = req.body;
        // Résoudre categoryId depuis le slug
        const catRow = await prisma_1.prisma.category.findUnique({ where: { slug: data.category } });
        if (!catRow) {
            res.status(400).json({ success: false, message: `Catégorie "${data.category}" introuvable` });
            return;
        }
        const product = await prisma_1.prisma.product.create({
            data: {
                ...data,
                categoryId: catRow.id,
                colors: colors ? JSON.stringify(colors) : null,
                images: {
                    create: images.map((url, i) => ({ url, position: i })),
                },
                specs: specs ? {
                    create: specs.map((s, i) => ({ ...s, position: i })),
                } : undefined,
            },
            include: {
                images: true,
                specs: true,
            },
        });
        res.status(201).json({ success: true, data: product });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/products/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.put('/:id', auth_1.requireAdmin, (0, validate_1.validate)(createProductSchema.partial()), async (req, res) => {
    try {
        const id = parseInt(req.params['id'] ?? '');
        const { images, specs, colors, ...data } = req.body;
        // Résoudre categoryId si le slug est fourni
        const catRow = data.category ? await prisma_1.prisma.category.findUnique({ where: { slug: data.category } }) : undefined;
        if (data.category && !catRow) {
            res.status(400).json({ success: false, message: `Catégorie "${data.category}" introuvable` });
            return;
        }
        // Vérifie la cohérence de la promo en fusionnant avec l'état actuel (mise à jour partielle)
        if ('salePrice' in data || 'saleStartsAt' in data || 'saleEndsAt' in data) {
            const current = await prisma_1.prisma.product.findUnique({
                where: { id }, select: { salePrice: true, saleStartsAt: true, saleEndsAt: true },
            });
            const merged = {
                salePrice: 'salePrice' in data ? data.salePrice : current?.salePrice,
                saleStartsAt: 'saleStartsAt' in data ? data.saleStartsAt : current?.saleStartsAt,
                saleEndsAt: 'saleEndsAt' in data ? data.saleEndsAt : current?.saleEndsAt,
            };
            const err = saleWindowError(merged);
            if (err) {
                res.status(400).json({ success: false, message: err });
                return;
            }
        }
        const product = await prisma_1.prisma.product.update({
            where: { id },
            data: {
                ...data,
                ...(catRow !== undefined ? { categoryId: catRow?.id ?? null } : {}),
                ...(colors !== undefined ? { colors: JSON.stringify(colors) } : {}),
                ...(images ? {
                    images: {
                        deleteMany: {},
                        create: images.map((url, i) => ({ url, position: i })),
                    },
                } : {}),
                ...(specs ? {
                    specs: {
                        deleteMany: {},
                        create: specs.map((s, i) => ({ ...s, position: i })),
                    },
                } : {}),
            },
            include: { images: true, specs: true },
        });
        res.json({ success: true, data: product });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/products/:id  [ADMIN]  (soft delete)
───────────────────────────────────────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params['id'] ?? '');
        await prisma_1.prisma.product.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true, message: 'Produit désactivé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map