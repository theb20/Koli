"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const sync_1 = require("csv-parse/sync");
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const rehostImage_1 = require("../lib/rehostImage");
const backendUrl_1 = require("../lib/backendUrl");
const deleteLocalUpload_1 = require("../lib/deleteLocalUpload");
const merchantFeed_1 = require("../lib/merchantFeed");
const logger_1 = require("../lib/logger");
const auditLog_1 = require("../lib/auditLog");
const router = (0, express_1.Router)();
/* ── Multer — import CSV/Excel en mémoire (petit fichier, pas besoin de disque) ── */
const csvUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB — largement suffisant pour un tableur de produits
    fileFilter: (_req, file, cb) => {
        if (/\.(csv|xlsx)$/i.test(file.originalname))
            cb(null, true);
        else
            cb(new Error('Seuls les fichiers CSV ou Excel (.xlsx) sont acceptés'));
    },
});
/* ── Schemas ─────────────────────────────────────────────────── */
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
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
    isActive: zod_1.z.boolean().optional(),
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
   GET /api/products/export   — tous les produits, actifs et inactifs,
   sans pagination. Protégé par clé API statique (PRODUCTS_EXPORT_API_KEY),
   pensé pour une intégration externe (ex: Google Sheets / Apps Script)
   qui ne peut pas gérer un token JWT expirant.
───────────────────────────────────────────────────────────── */
router.get('/export', (0, auth_1.requireApiKey)('PRODUCTS_EXPORT_API_KEY'), async (_req, res) => {
    try {
        const products = await prisma_1.prisma.product.findMany({
            orderBy: { id: 'asc' },
            include: {
                images: { orderBy: { position: 'asc' } },
                specs: { orderBy: { position: 'asc' } },
                store: { select: { id: true, name: true } },
                categoryRel: { select: { id: true, slug: true, name: true } },
            },
        });
        res.json({ success: true, data: { products, total: products.length } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/products/restore-images  [ADMIN] — réparation ponctuelle :
   réécrit des fichiers d'image sous leur nom EXACT d'origine dans
   uploads/products/, pour un serveur dont le disque a perdu des
   fichiers déjà référencés par ProductImage.url (rien n'est modifié
   en base, seul le fichier manquant est restauré). Le nom de fichier
   est strictement validé pour empêcher toute traversée de chemin —
   accepte uniquement le format généré par rehostImage/uploads produits.
───────────────────────────────────────────────────────────── */
const SAFE_PRODUCT_FILENAME = /^prod-\d+-[a-z0-9]+\.webp$/;
const restoreUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 50 },
});
router.post('/restore-images', auth_1.requireAdmin, restoreUpload.array('images', 50), async (req, res) => {
    try {
        const files = req.files ?? [];
        if (files.length === 0) {
            res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
            return;
        }
        const dir = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads', 'products');
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        const written = [];
        const rejected = [];
        for (const f of files) {
            if (!SAFE_PRODUCT_FILENAME.test(f.originalname)) {
                rejected.push(f.originalname);
                continue;
            }
            fs_1.default.writeFileSync(path_1.default.join(dir, f.originalname), f.buffer);
            written.push(f.originalname);
        }
        res.json({ success: true, data: { written, rejected } });
    }
    catch (err) {
        logger_1.logger.error('[products] échec restore-images', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products/image-jpg/:filename  — public. Sert une image
   produit en JPEG à partir du fichier WebP stocké — Google Merchant
   Center refuse le WebP pour `image_link` (JPEG/PNG/GIF uniquement),
   alors que le reste du site sert du WebP partout ailleurs (plus léger).
   Converti une seule fois puis mis en cache sur disque, pas de coût
   de conversion répété à chaque crawl de Google.
───────────────────────────────────────────────────────────── */
router.get('/image-jpg/:filename', async (req, res) => {
    try {
        const filename = req.params['filename'] ?? '';
        if (!SAFE_PRODUCT_FILENAME.test(filename)) {
            res.status(400).end();
            return;
        }
        const uploadRoot = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads');
        const srcPath = path_1.default.join(uploadRoot, 'products', filename);
        const cacheDir = path_1.default.join(uploadRoot, 'products-jpg');
        const cachePath = path_1.default.join(cacheDir, filename.replace(/\.webp$/, '.jpg'));
        if (!fs_1.default.existsSync(cachePath)) {
            if (!fs_1.default.existsSync(srcPath)) {
                res.status(404).end();
                return;
            }
            if (!fs_1.default.existsSync(cacheDir))
                fs_1.default.mkdirSync(cacheDir, { recursive: true });
            const jpeg = await (0, sharp_1.default)(srcPath).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
            fs_1.default.writeFileSync(cachePath, jpeg);
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs_1.default.createReadStream(cachePath).pipe(res);
    }
    catch (err) {
        logger_1.logger.error('[products] échec conversion image-jpg', err);
        res.status(500).end();
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/products/sync-merchant  [ADMIN] — pousse tous les
   produits actifs vers Google Merchant Center (API Merchant).
   Voir lib/merchantFeed.ts pour la configuration requise.
───────────────────────────────────────────────────────────── */
router.post('/sync-merchant', auth_1.requireAdmin, async (_req, res) => {
    try {
        if (!(0, merchantFeed_1.isMerchantConfigured)()) {
            res.status(400).json({ success: false, message: 'Google Merchant Center non configuré côté serveur (variables GOOGLE_MERCHANT_* manquantes)' });
            return;
        }
        const result = await (0, merchantFeed_1.syncAllProductsToMerchant)();
        res.json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('[products] échec sync Merchant', err);
        res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation avec Google Merchant Center' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products/:id
───────────────────────────────────────────────────────────── */
router.get('/:id', auth_1.optionalAuth, (0, cache_1.cacheControl)(20), (0, validate_1.validateParams)(validate_1.zIntIdParam), async (req, res) => {
    try {
        const id = Number(req.params['id']);
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
   Import CSV en masse — colonnes attendues : name, brand, category,
   price, oldPrice, badge, stock, isNew, description, images (URLs
   séparées par | ou ,).
   Flux en 2 temps, rien n'est écrit en base tant que l'admin n'a
   pas relu et confirmé l'aperçu :
     1. POST /bulk-import/preview  — parse + valide, ne touche pas la DB
     2. POST /bulk-import/commit   — recrée réellement les lignes validées
───────────────────────────────────────────────────────────── */
const bulkImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Nom trop court').max(200),
    brand: zod_1.z.string().min(1, 'Marque requise').max(100),
    category: zod_1.z.string().min(1, 'Catégorie requise'),
    price: zod_1.z.coerce.number().int('Prix invalide').positive('Prix invalide'),
    oldPrice: zod_1.z.coerce.number().int().positive().optional().or(zod_1.z.literal('')),
    badge: zod_1.z.enum(['hot', 'new', 'sale', 'top', '']).optional(),
    stock: zod_1.z.coerce.number().int().nonnegative().optional(),
    isNew: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    images: zod_1.z.string().optional(),
});
/** Convertit une cellule ExcelJS (texte riche, formule, nombre, bool...) en string simple */
function cellToString(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'object') {
        if ('text' in value && typeof value.text === 'string')
            return value.text; // rich text
        if ('result' in value)
            return cellToString(value.result); // formule
        if (value instanceof Date)
            return value.toISOString();
    }
    return String(value).trim();
}
async function parseXlsx(buffer) {
    const wb = new exceljs_1.default.Workbook();
    // exceljs redéclare son propre type ambiant "Buffer" (bug connu de ses .d.ts, incompatible
    // avec le Buffer générique de @types/node récent) — cast type-only, sans effet runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws)
        return [];
    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber] = cellToString(cell.value);
    });
    const records = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const record = {};
        let hasValue = false;
        headers.forEach((h, colNumber) => {
            if (!h)
                return;
            const str = cellToString(row.getCell(colNumber).value);
            if (str)
                hasValue = true;
            record[h] = str;
        });
        if (hasValue)
            records.push(record);
    }
    return records;
}
async function parseSpreadsheet(buffer, isXlsx) {
    if (isXlsx)
        return parseXlsx(buffer);
    return (0, sync_1.parse)(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
}
function validateBulkImportRows(records, categoryIdBySlug) {
    const valid = [];
    const skipped = [];
    for (let i = 0; i < records.length; i++) {
        const rowNum = i + 2; // +1 header, +1 index→1-based
        const parsed = bulkImportRowSchema.safeParse(records[i]);
        if (!parsed.success) {
            skipped.push({ row: rowNum, reason: parsed.error.issues.map(e => e.message).join(', ') });
            continue;
        }
        const d = parsed.data;
        if (!categoryIdBySlug.has(d.category)) {
            skipped.push({ row: rowNum, reason: `Catégorie "${d.category}" introuvable` });
            continue;
        }
        const imageUrls = (d.images ?? '').split(/[|,]/).map(s => s.trim()).filter(Boolean).slice(0, 4);
        if (imageUrls.length === 0) {
            skipped.push({ row: rowNum, reason: 'Au moins une image requise' });
            continue;
        }
        const invalidUrl = imageUrls.find(u => !zod_1.z.string().url().safeParse(u).success);
        if (invalidUrl) {
            skipped.push({ row: rowNum, reason: `URL image invalide : ${invalidUrl}` });
            continue;
        }
        valid.push({
            row: rowNum,
            data: {
                name: d.name,
                brand: d.brand,
                category: d.category,
                price: d.price,
                oldPrice: d.oldPrice || undefined,
                badge: d.badge || undefined,
                stock: d.stock ?? 100,
                isNew: ['true', '1', 'oui', 'yes'].includes((d.isNew ?? '').trim().toLowerCase()),
                description: d.description || undefined,
                images: imageUrls,
            },
        });
    }
    return { valid, skipped, total: records.length };
}
router.post('/bulk-import/preview', auth_1.requireAdmin, csvUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
            return;
        }
        const isXlsx = /\.xlsx$/i.test(req.file.originalname);
        let records;
        try {
            records = await parseSpreadsheet(req.file.buffer, isXlsx);
        }
        catch {
            res.status(400).json({ success: false, message: 'Fichier invalide ou mal formaté' });
            return;
        }
        if (records.length === 0) {
            res.status(400).json({ success: false, message: 'Le fichier est vide' });
            return;
        }
        if (records.length > 500) {
            res.status(400).json({ success: false, message: 'Maximum 500 lignes par import' });
            return;
        }
        const categories = await prisma_1.prisma.category.findMany({ select: { id: true, slug: true } });
        const categoryIdBySlug = new Map(categories.map(c => [c.slug, c.id]));
        const result = validateBulkImportRows(records, categoryIdBySlug);
        // Aucune écriture en base ni téléchargement d'image ici — pur aperçu.
        res.json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('[BULK-IMPORT-PREVIEW]', err);
        res.status(500).json({ success: false, message: "Erreur lors de l'analyse du fichier" });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/products/bulk-import/template  [ADMIN]
   Modèle Excel (.xlsx) prêt à l'emploi : en-têtes stylées, lignes
   d'exemple, liste déroulante de validation pour "category" (à
   partir des catégories réelles) et "badge".
───────────────────────────────────────────────────────────── */
router.get('/bulk-import/template', auth_1.requireAdmin, async (_req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({ select: { slug: true }, orderBy: { position: 'asc' } });
        const categorySlugs = categories.map(c => c.slug);
        const wb = new exceljs_1.default.Workbook();
        wb.creator = 'Skignas';
        wb.created = new Date();
        const ws = wb.addWorksheet('Produits');
        const columns = [
            { header: 'name', key: 'name', width: 32 },
            { header: 'brand', key: 'brand', width: 18 },
            { header: 'category', key: 'category', width: 16 },
            { header: 'price', key: 'price', width: 12 },
            { header: 'oldPrice', key: 'oldPrice', width: 12 },
            { header: 'badge', key: 'badge', width: 10 },
            { header: 'stock', key: 'stock', width: 10 },
            { header: 'isNew', key: 'isNew', width: 8 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'images', key: 'images', width: 60 },
        ];
        ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }));
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        headerRow.alignment = { vertical: 'middle' };
        headerRow.height = 20;
        ws.addRow({
            name: 'Manette Pro X', brand: 'GameX', category: categorySlugs[0] ?? 'gaming',
            price: 15000, oldPrice: 20000, badge: 'hot', stock: 30, isNew: 'true',
            description: 'Manette sans fil haute précision, autonomie 20h',
            images: 'https://exemple.com/image1.jpg|https://exemple.com/image2.jpg',
        });
        ws.addRow({
            name: 'Casque Gamer', brand: 'SoundMax', category: categorySlugs[0] ?? 'gaming',
            price: 25000, oldPrice: '', badge: 'new', stock: 15, isNew: 'false',
            description: 'Casque avec micro rétractable',
            images: 'https://exemple.com/image3.jpg',
        });
        ws.getRow(2).font = { italic: true, color: { argb: 'FF94A3B8' } };
        ws.getRow(3).font = { italic: true, color: { argb: 'FF94A3B8' } };
        // Listes déroulantes de validation sur les 500 premières lignes
        const LAST_ROW = 501;
        for (let r = 2; r <= LAST_ROW; r++) {
            if (categorySlugs.length > 0) {
                ws.getCell(`C${r}`).dataValidation = {
                    type: 'list', allowBlank: false,
                    formulae: [`"${categorySlugs.join(',')}"`],
                    showErrorMessage: true, errorTitle: 'Catégorie invalide',
                    error: 'Choisissez une catégorie existante dans la liste.',
                };
            }
            ws.getCell(`F${r}`).dataValidation = {
                type: 'list', allowBlank: true,
                formulae: ['"hot,new,sale,top"'],
                showErrorMessage: true, errorTitle: 'Badge invalide',
                error: 'Choisissez hot, new, sale ou top (ou laissez vide).',
            };
            ws.getCell(`H${r}`).dataValidation = {
                type: 'list', allowBlank: true,
                formulae: ['"true,false"'],
            };
        }
        const notes = wb.addWorksheet('Instructions');
        notes.columns = [{ header: 'Colonne', key: 'col', width: 16 }, { header: 'Explication', key: 'desc', width: 80 }];
        notes.getRow(1).font = { bold: true };
        notes.addRows([
            { col: 'name', desc: 'Nom du produit (min. 3 caractères)' },
            { col: 'brand', desc: 'Marque du produit' },
            { col: 'category', desc: `Slug d'une catégorie existante : ${categorySlugs.join(', ') || '(aucune catégorie créée)'}` },
            { col: 'price', desc: 'Prix de vente en FCFA, nombre entier positif' },
            { col: 'oldPrice', desc: 'Ancien prix barré (optionnel)' },
            { col: 'badge', desc: 'hot, new, sale, top — ou laisser vide' },
            { col: 'stock', desc: 'Quantité en stock (par défaut 100 si vide)' },
            { col: 'isNew', desc: 'true ou false' },
            { col: 'description', desc: 'Description du produit (optionnel)' },
            { col: 'images', desc: "Une ou plusieurs URLs d'image séparées par | (jusqu'à 4). Les images sont automatiquement retéléchargées et réhébergées côté serveur." },
        ]);
        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="modele-import-produits.xlsx"');
        res.send(Buffer.from(buffer));
    }
    catch (err) {
        logger_1.logger.error('[BULK-IMPORT-TEMPLATE]', err);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération du modèle' });
    }
});
const bulkImportCommitSchema = zod_1.z.object({
    storeId: zod_1.z.number().int().positive().optional(),
    rows: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(3).max(200),
        brand: zod_1.z.string().min(1).max(100),
        category: zod_1.z.string().min(1),
        price: zod_1.z.number().int().positive(),
        oldPrice: zod_1.z.number().int().positive().optional(),
        badge: zod_1.z.enum(['hot', 'new', 'sale', 'top']).optional(),
        stock: zod_1.z.number().int().nonnegative(),
        isNew: zod_1.z.boolean(),
        description: zod_1.z.string().optional(),
        images: zod_1.z.array(zod_1.z.string().url()).min(1).max(4),
    })).min(1).max(500),
});
router.post('/bulk-import/commit', auth_1.requireAdmin, (0, validate_1.validate)(bulkImportCommitSchema), async (req, res) => {
    try {
        const { storeId, rows } = req.body;
        const categories = await prisma_1.prisma.category.findMany({ select: { id: true, slug: true } });
        const categoryIdBySlug = new Map(categories.map(c => [c.slug, c.id]));
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        let created = 0;
        const skipped = [];
        for (let i = 0; i < rows.length; i++) {
            const d = rows[i];
            const categoryId = categoryIdBySlug.get(d.category);
            if (!categoryId) {
                skipped.push({ row: i + 1, reason: `Catégorie "${d.category}" introuvable` });
                continue;
            }
            const rehostedImages = await (0, rehostImage_1.rehostImages)(d.images, BASE_URL);
            await prisma_1.prisma.product.create({
                data: {
                    name: d.name,
                    brand: d.brand,
                    category: d.category,
                    categoryId,
                    storeId,
                    price: d.price,
                    oldPrice: d.oldPrice,
                    badge: d.badge,
                    stock: d.stock,
                    isNew: d.isNew,
                    description: d.description,
                    isActive: true,
                    images: { create: rehostedImages.map((url, idx) => ({ url, position: idx })) },
                },
            });
            created++;
        }
        res.json({ success: true, data: { created, skipped, total: rows.length } });
    }
    catch (err) {
        logger_1.logger.error('[BULK-IMPORT-COMMIT]', err);
        res.status(500).json({ success: false, message: "Erreur lors de l'import" });
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
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const rehostedImages = await (0, rehostImage_1.rehostImages)(images, BASE_URL);
        const product = await prisma_1.prisma.product.create({
            data: {
                ...data,
                categoryId: catRow.id,
                colors: colors ? JSON.stringify(colors) : null,
                images: {
                    create: rehostedImages.map((url, i) => ({ url, position: i })),
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
router.put('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), (0, validate_1.validate)(createProductSchema.partial()), async (req, res) => {
    try {
        const id = Number(req.params['id']);
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
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const rehostedImages = images ? await (0, rehostImage_1.rehostImages)(images, BASE_URL) : undefined;
        // Images actuelles — nécessaires pour nettoyer sur disque celles qui vont
        // être remplacées (Prisma ne fait que deleteMany les lignes, pas les fichiers).
        const previousImages = rehostedImages
            ? await prisma_1.prisma.productImage.findMany({ where: { productId: id }, select: { url: true } })
            : [];
        const product = await prisma_1.prisma.product.update({
            where: { id },
            data: {
                ...data,
                ...(catRow !== undefined ? { categoryId: catRow?.id ?? null } : {}),
                ...(colors !== undefined ? { colors: JSON.stringify(colors) } : {}),
                ...(rehostedImages ? {
                    images: {
                        deleteMany: {},
                        create: rehostedImages.map((url, i) => ({ url, position: i })),
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
        if (rehostedImages) {
            const keptUrls = new Set(rehostedImages);
            for (const old of previousImages) {
                if (!keptUrls.has(old.url))
                    (0, deleteLocalUpload_1.deleteLocalUpload)(old.url);
            }
        }
        res.json({ success: true, data: product });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/products/:id  [ADMIN]  (soft delete)
───────────────────────────────────────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zIntIdParam), async (req, res) => {
    try {
        const id = Number(req.params['id']);
        await prisma_1.prisma.product.update({ where: { id }, data: { isActive: false } });
        (0, auditLog_1.logAdminAction)(req, { action: 'product.delete', targetType: 'Product', targetId: String(id) });
        res.json({ success: true, message: 'Produit désactivé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map