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
const mailer_1 = require("../lib/mailer");
const backendUrl_1 = require("../lib/backendUrl");
const imageProcessing_1 = require("../lib/imageProcessing");
const logger_1 = require("../lib/logger");
const router = (0, express_1.Router)();
/* ── Multer — buffer en mémoire, converti en WebP avant écriture ── */
const reqUploadDir = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads', 'requests');
if (!fs_1.default.existsSync(reqUploadDir))
    fs_1.default.mkdirSync(reqUploadDir, { recursive: true });
const reqUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
        // heic/heif = format par défaut des photos iPhone — sans ça, l'upload
        // échoue silencieusement (500 générique) pour une bonne partie des mobiles.
        if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'));
    },
});
/**
 * Enveloppe reqUpload pour intercepter les erreurs multer (type de fichier
 * refusé, taille dépassée, trop de fichiers) et répondre avec un message
 * clair en 400 — sans ce wrapper, ces erreurs tombent dans le handler
 * d'erreur générique de l'app et ressortent en 500 "Erreur interne du
 * serveur", ce qui rend l'échec impossible à diagnostiquer côté client.
 */
function handleImageUpload(req, res, next) {
    reqUpload.array('images', 4)(req, res, (err) => {
        if (!err) {
            next();
            return;
        }
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ success: false, message: 'Image trop volumineuse (5 Mo maximum)' });
                return;
            }
            if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
                res.status(400).json({ success: false, message: '4 images maximum' });
                return;
            }
        }
        const message = err instanceof Error ? err.message : 'Fichier invalide';
        res.status(400).json({ success: false, message });
    });
}
/* ── Schemas ─────────────────────────────────────────────────── */
const createSchema = zod_1.z.object({
    clientPrenom: zod_1.z.string().min(2),
    clientNom: zod_1.z.string().min(2),
    clientEmail: zod_1.z.string().email(),
    clientTelephone: zod_1.z.string().optional(),
    productName: zod_1.z.string().min(2).max(200),
    description: zod_1.z.string().min(10).max(2000),
    images: zod_1.z.array(zod_1.z.string().url()).max(4).optional(),
    quantity: zod_1.z.coerce.number().int().positive().optional(),
    budget: zod_1.z.coerce.number().int().positive().optional(),
    deliveryAddress: zod_1.z.string().min(5),
    desiredDate: zod_1.z.coerce.date().optional(),
});
const replySchema = zod_1.z.object({
    message: zod_1.z.string().min(5).max(3000),
    quotedPrice: zod_1.z.coerce.number().int().positive().optional(),
});
/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests/upload-images — images de la demande
───────────────────────────────────────────────────────────── */
router.post('/upload-images', handleImageUpload, async (req, res) => {
    try {
        const files = req.files ?? [];
        if (files.length === 0) {
            res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
            return;
        }
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const urls = await Promise.all(files.map(async (f) => {
            const webp = await (0, imageProcessing_1.toWebp)(f.buffer);
            const filename = `req-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
            fs_1.default.writeFileSync(path_1.default.join(reqUploadDir, filename), webp);
            return `${BASE_URL}/uploads/requests/${filename}`;
        }));
        res.json({ success: true, data: { urls } });
    }
    catch (err) {
        logger_1.logger.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l'upload" });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests — Nouvelle demande de sourcing
───────────────────────────────────────────────────────────── */
router.post('/', auth_1.optionalAuth, (0, validate_1.validate)(createSchema), async (req, res) => {
    try {
        const body = req.body;
        const request = await prisma_1.prisma.productRequest.create({
            data: {
                userId: req.user?.userId ?? null,
                clientPrenom: body.clientPrenom,
                clientNom: body.clientNom,
                clientEmail: body.clientEmail,
                clientTelephone: body.clientTelephone,
                productName: body.productName,
                description: body.description,
                images: body.images?.length ? JSON.stringify(body.images) : null,
                quantity: body.quantity,
                budget: body.budget,
                deliveryAddress: body.deliveryAddress,
                desiredDate: body.desiredDate,
            },
        });
        (async () => {
            try {
                const admins = await prisma_1.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
                if (admins.length > 0) {
                    await prisma_1.prisma.notification.createMany({
                        data: admins.map(a => ({
                            userId: a.id,
                            type: 'order',
                            title: 'Nouvelle demande de sourcing',
                            body: `${body.clientPrenom} ${body.clientNom} recherche "${body.productName}"`,
                            link: `/product-requests/${request.id}`,
                        })),
                    });
                }
                const settings = await prisma_1.prisma.siteSettings.findUnique({ where: { id: 1 }, select: { orderNotifyEmails: true } });
                const recipients = (settings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean);
                await Promise.allSettled(recipients.map(email => (0, mailer_1.sendNewProductRequestAdminEmail)(email, {
                    id: request.id,
                    productName: body.productName,
                    description: body.description,
                    clientNom: `${body.clientPrenom} ${body.clientNom}`,
                    clientEmail: body.clientEmail,
                    clientTelephone: body.clientTelephone,
                    quantity: body.quantity,
                    budget: body.budget,
                    deliveryAddress: body.deliveryAddress,
                })));
            }
            catch (err) {
                logger_1.logger.error('[product-requests] échec notification admin', err); // non bloquant
            }
        })();
        res.status(201).json({
            success: true,
            message: 'Demande envoyée ! Notre équipe vous répondra sous 24-48h.',
            data: { id: request.id },
        });
    }
    catch (err) {
        logger_1.logger.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la demande" });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/mine — mes demandes (client connecté)
───────────────────────────────────────────────────────────── */
router.get('/mine', auth_1.optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            res.json({ success: true, data: { requests: [] } });
            return;
        }
        const requests = await prisma_1.prisma.productRequest.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: { requests: requests.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })) } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/admin/all  [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const status = req.query['status'];
        const where = status ? { status } : {};
        const [total, requests] = await Promise.all([
            prisma_1.prisma.productRequest.count({ where }),
            prisma_1.prisma.productRequest.findMany({
                where, orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
            }),
        ]);
        res.json({
            success: true,
            data: {
                requests: requests.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })),
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/product-requests/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        const request = await prisma_1.prisma.productRequest.findUnique({ where: { id: req.params['id'] } });
        if (!request) {
            res.status(404).json({ success: false, message: 'Demande introuvable' });
            return;
        }
        res.json({ success: true, data: { request: { ...request, images: request.images ? JSON.parse(request.images) : [] } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PATCH /api/product-requests/:id/status  [ADMIN]
───────────────────────────────────────────────────────────── */
router.patch('/:id/status', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        const { status } = zod_1.z.object({
            status: zod_1.z.enum(['new', 'processing', 'quoted', 'fulfilled', 'rejected', 'cancelled']),
        }).parse(req.body);
        const request = await prisma_1.prisma.productRequest.update({ where: { id: req.params['id'] }, data: { status } });
        res.json({ success: true, data: { request } });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: 'Statut invalide' });
            return;
        }
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
            res.status(404).json({ success: false, message: 'Demande introuvable' });
            return;
        }
        logger_1.logger.error('[PATCH product-request status]', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/product-requests/:id/reply  [ADMIN]
   Envoie une réponse personnalisée directement dans la boîte mail du client.
───────────────────────────────────────────────────────────── */
router.post('/:id/reply', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zCuidIdParam), (0, validate_1.validate)(replySchema), async (req, res) => {
    try {
        const { message, quotedPrice } = req.body;
        const request = await prisma_1.prisma.productRequest.findUnique({ where: { id: req.params['id'] } });
        if (!request) {
            res.status(404).json({ success: false, message: 'Demande introuvable' });
            return;
        }
        await (0, mailer_1.sendProductRequestReplyEmail)(request.clientEmail, request.clientPrenom, request.productName, message, quotedPrice);
        const updated = await prisma_1.prisma.productRequest.update({
            where: { id: request.id },
            data: {
                adminReply: message,
                quotedPrice: quotedPrice ?? request.quotedPrice,
                status: request.status === 'new' ? 'quoted' : request.status,
                repliedAt: new Date(),
            },
        });
        // Notification in-app si le client a un compte
        if (request.userId) {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: request.userId,
                    type: 'info',
                    title: 'Réponse à votre demande de sourcing',
                    body: `Nous avons répondu à votre demande concernant "${request.productName}"`,
                },
            }).catch(() => { });
        }
        res.json({ success: true, message: 'Réponse envoyée au client', data: { request: updated } });
    }
    catch (err) {
        logger_1.logger.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la réponse" });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/product-requests/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        await prisma_1.prisma.productRequest.delete({ where: { id: req.params['id'] } });
        res.json({ success: true, message: 'Demande supprimée' });
    }
    catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
            // Déjà supprimée (double-clic, liste obsolète côté client) — pas une vraie erreur serveur.
            res.status(404).json({ success: false, message: 'Demande déjà supprimée' });
            return;
        }
        logger_1.logger.error('[DELETE product-request]', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=product-requests.js.map