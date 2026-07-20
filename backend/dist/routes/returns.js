"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* ─────────────────────────────────────────────────────────────
   Retours de commande — machine à états stricte, appliquée
   uniquement côté serveur (jamais de transition de statut acceptée
   depuis le client sans passer par ADMIN_TRANSITIONS ci-dessous).

   requested → approved → received → refunded
       ↓            ↓          ↓
   cancelled     rejected   rejected

   Sécurité :
   - Compte requis pour demander un retour (pas de flux invité) —
     décision produit confirmée, cohérente avec le suivi long-terme
     qu'exige un retour (contrairement à une commande, ponctuelle).
   - Éligibilité vérifiée côté serveur à chaque création : commande
     livrée, dans la fenêtre SiteSettings.returnWindowDays, articles
     appartenant bien à la commande, quantité ne dépassant jamais ce
     qui a été acheté moins ce qui est déjà en cours de retour.
   - Remboursement plafonné au montant réellement payé pour les
     articles concernés — jamais un montant libre non borné.
   - Photos ré-hébergées sur notre propre stockage (jamais une URL
     externe acceptée telle quelle) et l'URL fournie doit pointer
     vers ce stockage avant d'être acceptée en base.
───────────────────────────────────────────────────────────── */
const express_1 = require("express");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const backendUrl_1 = require("../lib/backendUrl");
const mailer_1 = require("../lib/mailer");
const imageProcessing_1 = require("../lib/imageProcessing");
const router = (0, express_1.Router)();
/* ── Multer — buffer en mémoire, converti en WebP avant écriture ── */
const returnsUploadDir = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads', 'returns');
if (!fs_1.default.existsSync(returnsUploadDir))
    fs_1.default.mkdirSync(returnsUploadDir, { recursive: true });
const returnsUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, heic, avif)'));
    },
});
function handleImageUpload(req, res, next) {
    returnsUpload.array('images', 4)(req, res, (err) => {
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
                res.status(400).json({ success: false, message: '4 photos maximum' });
                return;
            }
        }
        const message = err instanceof Error ? err.message : 'Fichier invalide';
        res.status(400).json({ success: false, message });
    });
}
router.post('/upload-images', auth_1.requireAuth, handleImageUpload, async (req, res) => {
    try {
        const files = req.files ?? [];
        if (files.length === 0) {
            res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
            return;
        }
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const urls = await Promise.all(files.map(async (f) => {
            const webp = await (0, imageProcessing_1.toWebp)(f.buffer);
            const filename = `ret-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
            fs_1.default.writeFileSync(path_1.default.join(returnsUploadDir, filename), webp);
            return `${BASE_URL}/uploads/returns/${filename}`;
        }));
        res.json({ success: true, data: { urls } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l'upload" });
    }
});
/* ── Constantes ──────────────────────────────────────────────── */
const REASONS = ['defective', 'wrong_item', 'not_as_described', 'no_longer_needed', 'other'];
// Transitions valides côté admin — toute autre combinaison est rejetée en 409.
const ADMIN_TRANSITIONS = {
    requested: ['approved', 'rejected'],
    approved: ['received', 'rejected'],
    received: ['refunded', 'rejected'],
};
// Le client ne peut qu'annuler, et uniquement avant réception physique.
const CUSTOMER_CANCELABLE_FROM = ['requested', 'approved'];
/* ── Schemas ─────────────────────────────────────────────────── */
const createReturnSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    items: zod_1.z.array(zod_1.z.object({
        orderItemId: zod_1.z.coerce.number().int().positive(),
        quantity: zod_1.z.coerce.number().int().positive(),
    })).min(1).max(20),
    reason: zod_1.z.enum(REASONS),
    customerComment: zod_1.z.string().max(2000).optional(),
    photos: zod_1.z.array(zod_1.z.string().url()).max(4).optional(),
});
const adminStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['approved', 'rejected', 'received', 'refunded']),
    rejectionReason: zod_1.z.string().min(3).max(500).optional(),
    adminNotes: zod_1.z.string().max(2000).optional(),
    refundAmount: zod_1.z.coerce.number().int().min(0).optional(),
    refundMethod: zod_1.z.string().max(60).optional(),
});
/* ── Helpers ─────────────────────────────────────────────────── */
async function computeMaxRefundable(returnId) {
    const items = await prisma_1.prisma.orderReturnItem.findMany({
        where: { returnId },
        include: { orderItem: { select: { price: true } } },
    });
    return items.reduce((sum, it) => sum + it.orderItem.price * it.quantity, 0);
}
const RETURN_INCLUDE = {
    items: { include: { orderItem: true } },
    order: { select: { orderNumber: true, clientEmail: true, clientPrenom: true, total: true, status: true } },
};
/* ─────────────────────────────────────────────────────────────
   POST /api/returns — création d'une demande (compte requis)
───────────────────────────────────────────────────────────── */
router.post('/', auth_1.requireAuth, (0, validate_1.validate)(createReturnSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const body = req.body;
        const order = await prisma_1.prisma.order.findUnique({ where: { id: body.orderId }, include: { items: true } });
        if (!order || order.userId !== userId) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
        }
        if (order.status !== 'delivered' || !order.deliveredAt) {
            res.status(400).json({ success: false, message: 'Seule une commande livrée peut faire l\'objet d\'un retour' });
            return;
        }
        const settings = await prisma_1.prisma.siteSettings.findUnique({ where: { id: 1 }, select: { returnWindowDays: true } });
        const windowDays = settings?.returnWindowDays ?? 14;
        const deadline = new Date(order.deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
        if (new Date() > deadline) {
            res.status(400).json({ success: false, message: `Le délai de retour de ${windowDays} jours est dépassé` });
            return;
        }
        // Chaque article ciblé doit appartenir à cette commande.
        const orderItemsById = new Map(order.items.map(i => [i.id, i]));
        for (const line of body.items) {
            if (!orderItemsById.has(line.orderItemId)) {
                res.status(400).json({ success: false, message: 'Article invalide pour cette commande' });
                return;
            }
        }
        // Photos : n'accepter que des URLs pointant vers notre propre stockage
        // (jamais une image externe hébergée ailleurs, ni un lien arbitraire).
        const BASE_URL = (0, backendUrl_1.getBackendUrl)();
        const photoPrefix = `${BASE_URL}/uploads/returns/`;
        for (const url of body.photos ?? []) {
            if (!url.startsWith(photoPrefix)) {
                res.status(400).json({ success: false, message: 'Photo invalide — utilisez /api/returns/upload-images' });
                return;
            }
        }
        // Quantité déjà engagée dans un retour actif (non rejeté/annulé) pour
        // chaque article — empêche de demander plus que ce qui a été acheté.
        const orderItemIds = body.items.map(l => l.orderItemId);
        const activeReturnItems = await prisma_1.prisma.orderReturnItem.findMany({
            where: { orderItemId: { in: orderItemIds }, orderReturn: { status: { notIn: ['rejected', 'cancelled'] } } },
            select: { orderItemId: true, quantity: true },
        });
        const alreadyReserved = new Map();
        for (const it of activeReturnItems) {
            alreadyReserved.set(it.orderItemId, (alreadyReserved.get(it.orderItemId) ?? 0) + it.quantity);
        }
        for (const line of body.items) {
            const orderItem = orderItemsById.get(line.orderItemId);
            const reserved = alreadyReserved.get(line.orderItemId) ?? 0;
            if (reserved + line.quantity > orderItem.qty) {
                res.status(400).json({ success: false, message: `Quantité de retour invalide pour "${orderItem.name}"` });
                return;
            }
        }
        const created = await prisma_1.prisma.orderReturn.create({
            data: {
                orderId: order.id,
                userId,
                reason: body.reason,
                customerComment: body.customerComment,
                photos: body.photos && body.photos.length > 0 ? JSON.stringify(body.photos) : null,
                items: { create: body.items.map(l => ({ orderItemId: l.orderItemId, quantity: l.quantity })) },
            },
            include: RETURN_INCLUDE,
        });
        (0, mailer_1.sendReturnStatusEmail)(order.clientEmail, order.clientPrenom, order.orderNumber, 'requested').catch(() => { });
        const admins = await prisma_1.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
        if (admins.length > 0) {
            await prisma_1.prisma.notification.createMany({
                data: admins.map(a => ({
                    userId: a.id,
                    type: 'return',
                    title: 'Nouvelle demande de retour',
                    body: `${order.clientPrenom} ${order.clientNom} · ${order.orderNumber}`,
                    link: `/returns/${created.id}`,
                })),
            });
        }
        const siteSettings = await prisma_1.prisma.siteSettings.findUnique({ where: { id: 1 }, select: { orderNotifyEmails: true } });
        const recipients = (siteSettings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean);
        const itemsLabel = created.items.map(i => `${i.orderItem.name} ×${i.quantity}`).join(', ');
        Promise.allSettled(recipients.map(email => (0, mailer_1.sendNewReturnAdminEmail)(email, {
            orderNumber: order.orderNumber,
            clientNom: `${order.clientPrenom} ${order.clientNom}`,
            clientEmail: order.clientEmail,
            reason: body.reason,
            itemsLabel,
            returnId: created.id,
        }))).catch(() => { });
        res.status(201).json({ success: true, data: created });
    }
    catch (err) {
        console.error('[RETURNS] create', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/returns/mine — retours du client connecté
───────────────────────────────────────────────────────────── */
router.get('/mine', auth_1.requireAuth, async (req, res) => {
    const returns = await prisma_1.prisma.orderReturn.findMany({
        where: { userId: req.user.userId },
        include: RETURN_INCLUDE,
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: returns });
});
/* ─────────────────────────────────────────────────────────────
   GET /api/returns/admin/all — toutes les demandes (admin)
   ?status=requested|approved|rejected|received|refunded|cancelled
───────────────────────────────────────────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    const status = req.query['status'];
    const where = typeof status === 'string' && status ? { status } : {};
    const returns = await prisma_1.prisma.orderReturn.findMany({
        where,
        include: { ...RETURN_INCLUDE, user: { select: { id: true, prenom: true, nom: true, email: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: returns });
});
/* ─────────────────────────────────────────────────────────────
   GET /api/returns/:id — détail (propriétaire ou admin)
───────────────────────────────────────────────────────────── */
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    const id = req.params['id'] ?? '';
    const isAdmin = req.user.role === 'admin';
    const ret = await prisma_1.prisma.orderReturn.findFirst({
        where: { id, ...(isAdmin ? {} : { userId: req.user.userId }) },
        include: RETURN_INCLUDE,
    });
    if (!ret) {
        res.status(404).json({ success: false, message: 'Retour introuvable' });
        return;
    }
    res.json({ success: true, data: ret });
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/returns/:id/cancel — annulation par le client
───────────────────────────────────────────────────────────── */
router.put('/:id/cancel', auth_1.requireAuth, async (req, res) => {
    const id = req.params['id'] ?? '';
    const ret = await prisma_1.prisma.orderReturn.findFirst({ where: { id, userId: req.user.userId }, include: RETURN_INCLUDE });
    if (!ret) {
        res.status(404).json({ success: false, message: 'Retour introuvable' });
        return;
    }
    if (!CUSTOMER_CANCELABLE_FROM.includes(ret.status)) {
        res.status(409).json({ success: false, message: `Impossible d'annuler un retour au statut "${ret.status}"` });
        return;
    }
    const updated = await prisma_1.prisma.orderReturn.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: new Date() },
    });
    (0, mailer_1.sendReturnStatusEmail)(ret.order.clientEmail, ret.order.clientPrenom, ret.order.orderNumber, 'cancelled').catch(() => { });
    res.json({ success: true, data: updated });
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/returns/:id/status — transition admin
───────────────────────────────────────────────────────────── */
router.put('/:id/status', auth_1.requireAdmin, (0, validate_1.validate)(adminStatusSchema), async (req, res) => {
    const id = req.params['id'] ?? '';
    const body = req.body;
    const ret = await prisma_1.prisma.orderReturn.findUnique({ where: { id }, include: RETURN_INCLUDE });
    if (!ret) {
        res.status(404).json({ success: false, message: 'Retour introuvable' });
        return;
    }
    const allowed = ADMIN_TRANSITIONS[ret.status] ?? [];
    if (!allowed.includes(body.status)) {
        res.status(409).json({ success: false, message: `Transition invalide : "${ret.status}" → "${body.status}"` });
        return;
    }
    if (body.status === 'rejected' && !body.rejectionReason) {
        res.status(400).json({ success: false, message: 'Un motif de refus est requis' });
        return;
    }
    const now = new Date();
    const data = { status: body.status };
    if (body.adminNotes !== undefined)
        data['adminNotes'] = body.adminNotes;
    if (body.status === 'approved') {
        data['approvedAt'] = now;
        data['refundAmount'] = await computeMaxRefundable(id);
    }
    else if (body.status === 'rejected') {
        data['rejectedAt'] = now;
        data['rejectionReason'] = body.rejectionReason;
    }
    else if (body.status === 'received') {
        data['receivedAt'] = now;
    }
    else if (body.status === 'refunded') {
        const maxRefundable = ret.refundAmount ?? await computeMaxRefundable(id);
        const refundAmount = body.refundAmount ?? maxRefundable;
        if (refundAmount > maxRefundable) {
            res.status(400).json({ success: false, message: `Le remboursement ne peut pas dépasser ${maxRefundable} FCFA` });
            return;
        }
        data['refundedAt'] = now;
        data['refundAmount'] = refundAmount;
        data['refundMethod'] = body.refundMethod ?? null;
    }
    const updated = await prisma_1.prisma.orderReturn.update({ where: { id }, data });
    (0, mailer_1.sendReturnStatusEmail)(ret.order.clientEmail, ret.order.clientPrenom, ret.order.orderNumber, body.status, body.status === 'rejected' ? body.rejectionReason : undefined).catch(() => { });
    prisma_1.prisma.notification.create({
        data: {
            userId: ret.userId,
            type: 'return',
            title: `Retour ${ret.order.orderNumber} mis à jour`,
            body: `Nouveau statut : ${body.status}`,
            link: `/commandes/${ret.order.orderNumber}`,
        },
    }).catch(() => { });
    res.json({ success: true, data: updated });
});
exports.default = router;
//# sourceMappingURL=returns.js.map