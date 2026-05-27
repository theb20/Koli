"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const addressSchema = zod_1.z.object({
    label: zod_1.z.enum(['Domicile', 'Bureau', 'Autre']),
    prenom: zod_1.z.string().min(2),
    nom: zod_1.z.string().min(2),
    telephone: zod_1.z.string().min(8),
    ville: zod_1.z.string().min(2),
    quartier: zod_1.z.string().optional(),
    adresse: zod_1.z.string().min(5),
    isDefault: zod_1.z.boolean().optional(),
});
/* ── GET /api/addresses ─────────────────────────────────────── */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const addresses = await prisma_1.prisma.address.findMany({
        where: { userId: req.user.userId },
        orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    res.json({ success: true, data: addresses });
});
/* ── POST /api/addresses ────────────────────────────────────── */
router.post('/', auth_1.requireAuth, (0, validate_1.validate)(addressSchema), async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.userId;
        // Si nouvelle adresse par défaut → reset les autres
        if (data.isDefault) {
            await prisma_1.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        // Si première adresse → auto-default
        const count = await prisma_1.prisma.address.count({ where: { userId } });
        const isDefault = data.isDefault ?? (count === 0);
        const address = await prisma_1.prisma.address.create({ data: { ...data, userId, isDefault } });
        res.status(201).json({ success: true, data: address });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/addresses/:id ─────────────────────────────────── */
router.put('/:id', auth_1.requireAuth, (0, validate_1.validate)(addressSchema), async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.userId;
        const existing = await prisma_1.prisma.address.findFirst({ where: { id: req.params['id'], userId } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Adresse introuvable' });
            return;
        }
        if (data.isDefault) {
            await prisma_1.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        const updated = await prisma_1.prisma.address.update({
            where: { id: req.params['id'] },
            data: { ...data, isDefault: data.isDefault ?? existing.isDefault },
        });
        res.json({ success: true, data: updated });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/addresses/:id/default ────────────────────────── */
router.put('/:id/default', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const addr = await prisma_1.prisma.address.findFirst({ where: { id: req.params['id'], userId } });
        if (!addr) {
            res.status(404).json({ success: false, message: 'Adresse introuvable' });
            return;
        }
        await prisma_1.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        await prisma_1.prisma.address.update({ where: { id: req.params['id'] }, data: { isDefault: true } });
        res.json({ success: true, message: 'Adresse par défaut mise à jour' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/addresses/:id ──────────────────────────────── */
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const addr = await prisma_1.prisma.address.findFirst({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        if (!addr) {
            res.status(404).json({ success: false, message: 'Adresse introuvable' });
            return;
        }
        await prisma_1.prisma.address.delete({ where: { id: req.params['id'] } });
        res.json({ success: true, message: 'Adresse supprimée' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=addresses.js.map