"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const DEFAULT_STEPS = [
    { label: 'Commande reçue', done: true, timestamp: null },
    { label: 'Prise en charge SAV', done: false, timestamp: null },
    { label: 'En cours de livraison', done: false, timestamp: null },
    { label: 'Livré', done: false, timestamp: null },
];
/* GET /api/delivery/:orderNumber — suivi public */
router.get('/:orderNumber', auth_1.requireAuth, (0, validate_1.validateParams)(validate_1.zOrderNumberParam), async (req, res) => {
    try {
        const order = await prisma_1.prisma.order.findFirst({
            where: {
                OR: [{ orderNumber: req.params['orderNumber'] }, { id: req.params['orderNumber'] }],
                userId: req.user.userId,
            },
            include: { delivery: true },
        });
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable.' });
            return;
        }
        let steps = DEFAULT_STEPS;
        if (order.delivery?.steps) {
            try {
                steps = JSON.parse(order.delivery.steps);
            }
            catch { /* ignore */ }
        }
        else {
            // auto-compléter les étapes selon le statut
            const idx = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.status);
            steps = DEFAULT_STEPS.map((s, i) => ({ ...s, done: i <= idx }));
        }
        res.json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                status: order.status,
                driverName: order.delivery?.driverName ?? null,
                driverPhone: order.delivery?.driverPhone ?? null,
                photo: order.delivery?.photo ?? null,
                steps,
                estimatedDelivery: null,
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* PATCH /api/delivery/:orderNumber  [ADMIN] — mettre à jour le suivi */
router.patch('/:orderNumber', auth_1.requireAdmin, (0, validate_1.validateParams)(validate_1.zOrderNumberParam), async (req, res) => {
    try {
        const body = zod_1.z.object({
            driverName: zod_1.z.string().optional(),
            driverPhone: zod_1.z.string().optional(),
            photo: zod_1.z.string().optional(),
            steps: zod_1.z.array(zod_1.z.object({
                label: zod_1.z.string(),
                done: zod_1.z.boolean(),
                timestamp: zod_1.z.string().nullable().optional(),
            })).optional(),
        }).parse(req.body);
        const order = await prisma_1.prisma.order.findFirst({
            where: { OR: [{ orderNumber: req.params['orderNumber'] }, { id: req.params['orderNumber'] }] },
        });
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable.' });
            return;
        }
        const delivery = await prisma_1.prisma.delivery.upsert({
            where: { orderId: order.id },
            update: {
                ...(body.driverName ? { driverName: body.driverName } : {}),
                ...(body.driverPhone ? { driverPhone: body.driverPhone } : {}),
                ...(body.photo ? { photo: body.photo } : {}),
                ...(body.steps ? { steps: JSON.stringify(body.steps) } : {}),
            },
            create: {
                orderId: order.id,
                driverName: body.driverName,
                driverPhone: body.driverPhone,
                photo: body.photo,
                steps: JSON.stringify(body.steps ?? DEFAULT_STEPS),
            },
        });
        res.json({ success: true, data: { delivery } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=delivery.js.map