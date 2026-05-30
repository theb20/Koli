"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
/* ── GET /api/promo/:code — Valider un code ────────────────── */
router.get('/:code', async (req, res) => {
    try {
        const code = req.params['code'].toUpperCase();
        const total = parseInt(req.query['total']) || 0; // montant du panier
        const promo = await prisma_1.prisma.promoCode.findFirst({
            where: {
                code,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
        });
        if (!promo) {
            res.status(404).json({ success: false, message: 'Code promo invalide ou expiré' });
            return;
        }
        if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
            res.status(400).json({ success: false, message: 'Ce code a atteint sa limite d\'utilisation' });
            return;
        }
        if (total > 0 && total < promo.minOrder) {
            res.status(400).json({
                success: false,
                message: `Commande minimum de ${(promo.minOrder / 100).toLocaleString('fr-FR')} FCFA requise`,
            });
            return;
        }
        const discount = promo.type === 'percent'
            ? Math.round(total * promo.value / 100)
            : promo.value;
        res.json({
            success: true,
            data: {
                code: promo.code,
                type: promo.type,
                value: promo.value,
                discount,
                minOrder: promo.minOrder,
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── POST /api/promo  [ADMIN] — Créer un code ─────────────── */
router.post('/', auth_1.requireAdmin, (0, validate_1.validate)(zod_1.z.object({
    code: zod_1.z.string().min(3).max(20).toUpperCase(),
    type: zod_1.z.enum(['percent', 'fixed']),
    value: zod_1.z.number().int().positive(),
    minOrder: zod_1.z.number().int().nonnegative().default(0),
    maxUses: zod_1.z.number().int().positive().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
})), async (req, res) => {
    try {
        const data = req.body;
        const promo = await prisma_1.prisma.promoCode.create({
            data: {
                ...data,
                code: data.code.toUpperCase(),
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            },
        });
        res.status(201).json({ success: true, data: promo });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/promo  [ADMIN] — Lister les codes ──────────── */
router.get('/', auth_1.requireAdmin, async (_req, res) => {
    try {
        const promos = await prisma_1.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: promos });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── DELETE /api/promo/:id  [ADMIN] ───────────────────────── */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        await prisma_1.prisma.promoCode.update({
            where: { id: parseInt(req.params['id'] ?? '') },
            data: { isActive: false },
        });
        res.json({ success: true, message: 'Code promo désactivé' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/promo/admin/all  [ADMIN] ──────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (_req, res) => {
    try {
        const promos = await prisma_1.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: { promos } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/promo/:id/toggle  [ADMIN] ──────────────────── */
router.patch('/:id/toggle', auth_1.requireAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const promo = await prisma_1.prisma.promoCode.update({ where: { id: parseInt(req.params['id']) }, data: { isActive } });
        res.json({ success: true, data: { promo } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=promo.js.map