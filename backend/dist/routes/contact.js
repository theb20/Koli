"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const mailer_1 = require("../lib/mailer");
const router = (0, express_1.Router)();
const contactSchema = zod_1.z.object({
    prenom: zod_1.z.string().min(2).max(50),
    nom: zod_1.z.string().min(2).max(50),
    email: zod_1.z.string().email(),
    telephone: zod_1.z.string().optional(),
    sujet: zod_1.z.string().min(1).max(100),
    message: zod_1.z.string().min(20, 'Message trop court').max(2000),
});
/* ── POST /api/contact ─────────────────────────────────────── */
router.post('/', (0, validate_1.validate)(contactSchema), async (req, res) => {
    try {
        const data = req.body;
        await prisma_1.prisma.contactMessage.create({ data });
        // Email de confirmation automatique
        (0, mailer_1.sendContactReply)(data.email, data.prenom, data.sujet).catch(() => { });
        res.status(201).json({
            success: true,
            message: 'Message reçu ! Nous vous répondrons sous 24h.',
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/contact  [ADMIN] ─────────────────────────────── */
router.get('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const status = req.query['status'];
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const where = status ? { status } : {};
        const [total, messages] = await Promise.all([
            prisma_1.prisma.contactMessage.count({ where }),
            prisma_1.prisma.contactMessage.findMany({
                where, orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
            }),
        ]);
        res.json({ success: true, data: { messages, pagination: { page, limit, total } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/contact/:id/status  [ADMIN] ─────────────────── */
router.put('/:id/status', auth_1.requireAdmin, async (req, res) => {
    try {
        const { status } = zod_1.z.object({ status: zod_1.z.enum(['new', 'read', 'replied']) }).parse(req.body);
        await prisma_1.prisma.contactMessage.update({ where: { id: req.params['id'] }, data: { status } });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/contact/admin/all  [ADMIN] ────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const [total, messages] = await Promise.all([
            prisma_1.prisma.contactMessage.count(),
            prisma_1.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        ]);
        res.json({ success: true, data: { messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/contact/:id/read  [ADMIN] ──────────────────── */
router.patch('/:id/read', auth_1.requireAdmin, async (req, res) => {
    try {
        const msg = await prisma_1.prisma.contactMessage.update({ where: { id: req.params['id'] }, data: { status: 'read' } });
        res.json({ success: true, data: { message: msg } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/contact/:id  [ADMIN] ──────────────────────── */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        await prisma_1.prisma.contactMessage.delete({ where: { id: req.params['id'] } });
        res.json({ success: true, message: 'Message supprimé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=contact.js.map