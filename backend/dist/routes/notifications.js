"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
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
router.put('/:id/read', auth_1.requireAuth, async (req, res) => {
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
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=notifications.js.map