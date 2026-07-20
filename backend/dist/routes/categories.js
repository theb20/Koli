"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const backendUrl_1 = require("../lib/backendUrl");
const deleteLocalUpload_1 = require("../lib/deleteLocalUpload");
const imageProcessing_1 = require("../lib/imageProcessing");
const logger_1 = require("../lib/logger");
const auditLog_1 = require("../lib/auditLog");
/* ── Multer — buffer en mémoire, converti en WebP avant écriture ── */
const catUploadDir = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads', 'cat');
if (!fs_1.default.existsSync(catUploadDir))
    fs_1.default.mkdirSync(catUploadDir, { recursive: true });
const catUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'));
    },
});
/** Cf. product-requests.ts — évite qu'une erreur multer ressorte en 500 générique */
function handleCatImageUpload(req, res, next) {
    catUpload.single('image')(req, res, (err) => {
        if (!err) {
            next();
            return;
        }
        if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ success: false, message: 'Image trop volumineuse (5 Mo maximum)' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Fichier invalide';
        res.status(400).json({ success: false, message });
    });
}
const router = (0, express_1.Router)();
/* ── Schema ──────────────────────────────────────────────────── */
const categorySchema = zod_1.z.object({
    slug: zod_1.z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug: lettres minuscules, chiffres et tirets uniquement'),
    name: zod_1.z.string().min(2).max(80),
    description: zod_1.z.string().max(300).optional(),
    icon: zod_1.z.string().max(10).optional(),
    image: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    tag: zod_1.z.string().max(30).optional(),
    position: zod_1.z.number().int().min(0).optional(),
    isActive: zod_1.z.boolean().optional(),
});
/* ─────────────────────────────────────────────────────────────
   GET /api/categories — public, catégories actives triées
───────────────────────────────────────────────────────────── */
router.get('/', (0, cache_1.cacheControl)(300), async (_req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { position: 'asc' },
        });
        res.json({ success: true, data: categories });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/categories/admin — toutes les catégories [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin', auth_1.requireAdmin, async (_req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            orderBy: { position: 'asc' },
        });
        res.json({ success: true, data: categories });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/categories [ADMIN] — créer
───────────────────────────────────────────────────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(categorySchema), async (req, res) => {
    try {
        const body = req.body;
        // Auto-position à la fin si non fourni
        if (body.position === undefined) {
            const last = await prisma_1.prisma.category.findFirst({ orderBy: { position: 'desc' } });
            body.position = (last?.position ?? -1) + 1;
        }
        const existing = await prisma_1.prisma.category.findUnique({ where: { slug: body.slug } });
        if (existing) {
            res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé' });
            return;
        }
        const category = await prisma_1.prisma.category.create({ data: body });
        res.status(201).json({ success: true, data: category });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur lors de la création' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/categories/:id [ADMIN] — mettre à jour
───────────────────────────────────────────────────────────── */
router.put('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), (0, validate_1.validate)(categorySchema.partial()), async (req, res) => {
    try {
        const id = Number(req.params['id']);
        const body = req.body;
        // Vérifier unicité du slug si changé
        if (body.slug) {
            const existing = await prisma_1.prisma.category.findFirst({ where: { slug: body.slug, NOT: { id } } });
            if (existing) {
                res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé' });
                return;
            }
        }
        const category = await prisma_1.prisma.category.update({
            where: { id },
            data: body,
        });
        res.json({ success: true, data: category });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PATCH /api/categories/:id/toggle [ADMIN] — activer / désactiver
───────────────────────────────────────────────────────────── */
router.patch('/:id/toggle', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), async (req, res) => {
    try {
        const id = Number(req.params['id']);
        const cat = await prisma_1.prisma.category.findUnique({ where: { id } });
        if (!cat) {
            res.status(404).json({ success: false, message: 'Catégorie introuvable' });
            return;
        }
        const updated = await prisma_1.prisma.category.update({ where: { id }, data: { isActive: !cat.isActive } });
        res.json({ success: true, data: updated });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PATCH /api/categories/reorder [ADMIN] — réordonner
   Body: { order: number[] }  (tableau d'IDs dans l'ordre voulu)
───────────────────────────────────────────────────────────── */
router.patch('/reorder', auth_1.requireAdmin, async (req, res) => {
    try {
        const schema = zod_1.z.object({ order: zod_1.z.array(zod_1.z.number().int().positive()).min(1) });
        const { order } = schema.parse(req.body);
        await Promise.all(order.map((id, idx) => prisma_1.prisma.category.update({ where: { id }, data: { position: idx } })));
        res.json({ success: true, message: 'Ordre mis à jour' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/categories/:id [ADMIN] — supprimer
───────────────────────────────────────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), async (req, res) => {
    try {
        const id = Number(req.params['id']);
        const cat = await prisma_1.prisma.category.findUnique({ where: { id }, select: { image: true } });
        await prisma_1.prisma.category.delete({ where: { id } });
        if (cat?.image)
            (0, deleteLocalUpload_1.deleteLocalUpload)(cat.image);
        (0, auditLog_1.logAdminAction)(req, { action: 'category.delete', targetType: 'Category', targetId: String(id) });
        res.json({ success: true, message: 'Catégorie supprimée' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/categories/:id/image [ADMIN] — uploader une image
   Stocke dans uploads/cat/ et met à jour le champ image
───────────────────────────────────────────────────────────── */
router.post('/:id/image', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), handleCatImageUpload, async (req, res) => {
    try {
        const id = Number(req.params['id']);
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
            return;
        }
        const webp = await (0, imageProcessing_1.toWebp)(req.file.buffer);
        const filename = `cat-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
        fs_1.default.writeFileSync(path_1.default.join(catUploadDir, filename), webp);
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const imageUrl = `${BASE_URL}/uploads/cat/${filename}`;
        // Supprimer l'ancienne image si c'est un fichier local
        const cat = await prisma_1.prisma.category.findUnique({ where: { id } });
        if (cat?.image)
            (0, deleteLocalUpload_1.deleteLocalUpload)(cat.image);
        const updated = await prisma_1.prisma.category.update({
            where: { id },
            data: { image: imageUrl },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        logger_1.logger.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l'upload" });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map