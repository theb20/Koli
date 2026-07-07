"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const router = (0, express_1.Router)();
const taxSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80),
    rate: zod_1.z.coerce.number().min(0).max(100),
    isDefault: zod_1.z.boolean().optional().default(false),
    isActive: zod_1.z.boolean().optional().default(true),
});
/* ── GET /api/tax  — liste publique (pour le checkout) ───── */
router.get('/', (0, cache_1.cacheControl)(300), async (_req, res) => {
    try {
        const taxes = await prisma_1.prisma.taxRate.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ success: true, data: { taxes } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/tax/default  — taux actif par défaut ────────── */
router.get('/default', (0, cache_1.cacheControl)(300), async (_req, res) => {
    try {
        const tax = await prisma_1.prisma.taxRate.findFirst({
            where: { isDefault: true, isActive: true },
        });
        res.json({ success: true, data: { tax: tax ?? null } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/tax/admin/all  [ADMIN] ───────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (_req, res) => {
    try {
        const taxes = await prisma_1.prisma.taxRate.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: { taxes } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/tax  [ADMIN] ────────────────────────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(taxSchema), async (req, res) => {
    try {
        const data = req.body;
        // Si ce taux devient défaut, désactiver les autres
        if (data.isDefault) {
            await prisma_1.prisma.taxRate.updateMany({ data: { isDefault: false } });
        }
        const tax = await prisma_1.prisma.taxRate.create({ data });
        res.status(201).json({ success: true, data: { tax } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/tax/:id  [ADMIN] ─────────────────────────────── */
router.put('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const data = taxSchema.partial().parse(req.body);
        if (data.isDefault) {
            await prisma_1.prisma.taxRate.updateMany({ data: { isDefault: false } });
        }
        const tax = await prisma_1.prisma.taxRate.update({ where: { id: req.params['id'] }, data });
        res.json({ success: true, data: { tax } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/tax/:id/default  [ADMIN] ───────────────────── */
router.patch('/:id/default', auth_1.requireAdmin, async (req, res) => {
    try {
        await prisma_1.prisma.taxRate.updateMany({ data: { isDefault: false } });
        const tax = await prisma_1.prisma.taxRate.update({
            where: { id: req.params['id'] },
            data: { isDefault: true, isActive: true },
        });
        res.json({ success: true, data: { tax } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/tax/:id/toggle  [ADMIN] ────────────────────── */
router.patch('/:id/toggle', auth_1.requireAdmin, async (req, res) => {
    try {
        const existing = await prisma_1.prisma.taxRate.findUnique({ where: { id: req.params['id'] } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Taux introuvable' });
            return;
        }
        const tax = await prisma_1.prisma.taxRate.update({
            where: { id: req.params['id'] },
            data: { isActive: !existing.isActive },
        });
        res.json({ success: true, data: { tax } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/tax/:id  [ADMIN] ──────────────────────────── */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        await prisma_1.prisma.taxRate.delete({ where: { id: req.params['id'] } });
        res.json({ success: true, message: 'Taux supprimé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=tax.js.map