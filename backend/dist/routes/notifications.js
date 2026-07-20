"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const mailer_1 = require("../lib/mailer");
const logger_1 = require("../lib/logger");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
/* ── GET /api/notifications ─────────────────────────────────── */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const unreadOnly = req.query['unread'] === 'true';
        const where = { userId: req.user.userId, ...(unreadOnly ? { isRead: false } : {}) };
        const [total, notifications, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.findMany({
                where, orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
            }),
            prisma_1.prisma.notification.count({ where: { userId: req.user.userId, isRead: false } }),
        ]);
        res.json({ success: true, data: { notifications, unreadCount, pagination: { page, limit, total } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/notifications/:id/read ───────────────────────── */
router.put('/:id/read', auth_1.requireAuth, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { id: req.params['id'], userId: req.user.userId },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/notifications/read-all ────────────────────────── */
router.put('/read-all', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { userId: req.user.userId, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/notifications/:id ─────────────────────────── */
router.delete('/:id', auth_1.requireAuth, (0, validate_1.validateParams)(validate_1.zCuidIdParam), async (req, res) => {
    try {
        await prisma_1.prisma.notification.deleteMany({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/notifications/admin/all  [ADMIN] ──────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 30;
        const [total, notifications] = await Promise.all([
            prisma_1.prisma.notification.count(),
            prisma_1.prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
                include: { user: { select: { id: true, prenom: true, nom: true, email: true } } },
            }),
        ]);
        const unread = await prisma_1.prisma.notification.count({ where: { isRead: false } });
        res.json({ success: true, data: { notifications, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/notifications/admin/clear  [ADMIN] ─────────── */
router.delete('/admin/clear', auth_1.requireAdmin, async (_req, res) => {
    try {
        const { count } = await prisma_1.prisma.notification.deleteMany();
        res.json({ success: true, message: `${count} notifications supprimées` });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
const broadcastSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(120),
    message: zod_1.z.string().min(1).max(2000),
    type: zod_1.z.enum(['info', 'order', 'return', 'promo']).default('info'),
});
/* ── POST /api/notifications/broadcast  [ADMIN] ─────────────── */
/* Notification in-app → tous les clients actifs (non bannis).
   Email → uniquement les clients ayant accepté la newsletter (consentement marketing). */
router.post('/broadcast', auth_1.requireAdmin, (0, validate_1.validate)(broadcastSchema), async (req, res) => {
    try {
        const { title, message, type } = req.body;
        const users = await prisma_1.prisma.user.findMany({
            where: { isBanned: false },
            select: { id: true, prenom: true, email: true, subscribedToNewsletter: true },
        });
        if (users.length === 0) {
            res.json({ success: true, message: 'Aucun client actif.' });
            return;
        }
        await prisma_1.prisma.notification.createMany({
            data: users.map(u => ({ userId: u.id, title, body: message, type })),
        });
        const emailRecipients = users.filter(u => u.subscribedToNewsletter);
        Promise.allSettled(emailRecipients.map(u => (0, mailer_1.sendBroadcastEmail)(u.email, u.prenom, title, message))).then(results => {
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0)
                logger_1.logger.error(`[broadcast email] ${failed}/${emailRecipients.length} envois échoués`);
        });
        res.json({
            success: true,
            message: `Notification envoyée à ${users.length} client(s) — email à ${emailRecipients.length} abonné(s) newsletter`,
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map