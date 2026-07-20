"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const router = (0, express_1.Router)();
const blogSchema = zod_1.z.object({
    slug: zod_1.z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
    title: zod_1.z.string().min(5).max(200),
    excerpt: zod_1.z.string().min(10).max(500),
    body: zod_1.z.string().min(50),
    coverImage: zod_1.z.string().url(),
    category: zod_1.z.enum(['tech', 'style', 'lifestyle', 'guide', 'news']),
    tags: zod_1.z.array(zod_1.z.string()).max(10),
    author: zod_1.z.string().min(2),
    authorImage: zod_1.z.string().url().optional(),
    readTime: zod_1.z.number().int().positive().default(5),
    isPublished: zod_1.z.boolean().default(false),
});
/* ── GET /api/blog ──────────────────────────────────────────── */
router.get('/', (0, cache_1.cacheControl)(60), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query['page']) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query['limit']) || 9));
        const category = req.query['category'];
        const q = req.query['q'];
        const where = {
            isPublished: true,
            ...(category && { category }),
            ...(q && { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }),
        };
        const [total, posts] = await Promise.all([
            prisma_1.prisma.blogPost.count({ where }),
            prisma_1.prisma.blogPost.findMany({
                where, orderBy: { publishedAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
                select: {
                    id: true, slug: true, title: true, excerpt: true,
                    coverImage: true, category: true, tags: true,
                    author: true, authorImage: true, readTime: true,
                    views: true, likes: true, publishedAt: true,
                },
            }),
        ]);
        res.json({ success: true, data: { posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/blog/:slug ────────────────────────────────────── */
router.get('/:slug', async (req, res) => {
    try {
        const post = await prisma_1.prisma.blogPost.findFirst({
            where: { slug: req.params['slug'], isPublished: true },
        });
        if (!post) {
            res.status(404).json({ success: false, message: 'Article introuvable' });
            return;
        }
        // Incrémenter les vues + récupérer les articles liés en parallèle (indépendants l'un de l'autre)
        const [, related] = await Promise.all([
            prisma_1.prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }),
            prisma_1.prisma.blogPost.findMany({
                where: { category: post.category, id: { not: post.id }, isPublished: true },
                take: 3, orderBy: { views: 'desc' },
                select: { id: true, slug: true, title: true, coverImage: true, readTime: true, publishedAt: true },
            }),
        ]);
        res.json({ success: true, data: { post, related } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/blog/:slug/like ──────────────────────────────── */
router.post('/:slug/like', async (req, res) => {
    try {
        await prisma_1.prisma.blogPost.updateMany({
            where: { slug: req.params['slug'] },
            data: { likes: { increment: 1 } },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/blog  [ADMIN] ────────────────────────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(blogSchema), async (req, res) => {
    try {
        const data = req.body;
        const post = await prisma_1.prisma.blogPost.create({
            data: {
                ...data,
                tags: JSON.stringify(data.tags),
                publishedAt: data.isPublished ? new Date() : null,
            },
        });
        res.status(201).json({ success: true, data: post });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/blog/:id  [ADMIN] ─────────────────────────────── */
router.put('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const schema = blogSchema.partial();
        const data = schema.parse(req.body);
        const { tags: rawTags, ...restData } = data;
        const post = await prisma_1.prisma.blogPost.update({
            where: { id: parseInt(req.params['id'] ?? '') },
            data: {
                ...restData,
                ...(rawTags !== undefined ? { tags: JSON.stringify(rawTags) } : {}),
                ...(restData.isPublished === true ? { publishedAt: new Date() } : {}),
            },
        });
        res.json({ success: true, data: post });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/blog/:id  [ADMIN] ─────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        await prisma_1.prisma.blogPost.delete({ where: { id: parseInt(req.params['id'] ?? '') } });
        res.json({ success: true, message: 'Article supprimé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/blog/admin/all  [ADMIN] — tous les articles ─── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 15;
        const [total, posts] = await Promise.all([
            prisma_1.prisma.blogPost.count(),
            prisma_1.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        ]);
        res.json({ success: true, data: { posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/blog/admin/:id  [ADMIN] ───────────────────────── */
router.get('/admin/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const post = await prisma_1.prisma.blogPost.findUnique({ where: { id: parseInt(req.params['id']) } });
        if (!post) {
            res.status(404).json({ success: false, message: 'Article introuvable' });
            return;
        }
        res.json({ success: true, data: { post } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/blog/:id/publish  [ADMIN] ──────────────────── */
router.patch('/:id/publish', auth_1.requireAdmin, async (req, res) => {
    try {
        const { isPublished } = req.body;
        const post = await prisma_1.prisma.blogPost.update({
            where: { id: parseInt(req.params['id']) },
            data: { isPublished, ...(isPublished ? { publishedAt: new Date() } : {}) },
        });
        res.json({ success: true, data: { post } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=blog.js.map