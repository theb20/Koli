"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const mailer_1 = require("../lib/mailer");
const router = (0, express_1.Router)();
/* ── Helpers ─────────────────────────────────────────────────── */
function generateOrderNumber() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `KLI-${date}-${rand}`;
}
/* ── Schemas ─────────────────────────────────────────────────── */
const createOrderSchema = zod_1.z.object({
    // Infos client
    clientPrenom: zod_1.z.string().min(2),
    clientNom: zod_1.z.string().min(2),
    clientEmail: zod_1.z.string().email(),
    clientTelephone: zod_1.z.string().min(8),
    // Livraison
    deliveryMethod: zod_1.z.enum(['standard', 'express']),
    shippingAddress: zod_1.z.object({
        ville: zod_1.z.string(),
        quartier: zod_1.z.string().optional(),
        adresse: zod_1.z.string(),
        instructions: zod_1.z.string().optional(),
    }),
    // Paiement
    paymentMethod: zod_1.z.enum(['orange', 'mtn', 'wave', 'cash']),
    // Articles
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.number().int().positive(),
        qty: zod_1.z.number().int().positive(),
        color: zod_1.z.string().optional(),
    })).min(1, 'Le panier est vide'),
    // Promo
    promoCode: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
/* ─────────────────────────────────────────────────────────────
   POST /api/orders  — Créer une commande
───────────────────────────────────────────────────────────── */
router.post('/', auth_1.optionalAuth, (0, validate_1.validate)(createOrderSchema), async (req, res) => {
    try {
        const body = req.body;
        // 0. Vérifier que l'utilisateur n'est pas banni
        if (req.user) {
            const account = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { isBanned: true },
            });
            if (account?.isBanned) {
                res.status(403).json({ success: false, message: 'Votre compte est suspendu. Contactez le support.' });
                return;
            }
        }
        // 1. Récupérer les produits et vérifier le stock
        const productIds = body.items.map(i => i.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            include: { images: { take: 1, orderBy: { position: 'asc' } } },
        });
        if (products.length !== productIds.length) {
            res.status(400).json({ success: false, message: 'Un ou plusieurs produits sont introuvables' });
            return;
        }
        // Vérifier le stock
        for (const item of body.items) {
            const p = products.find(p => p.id === item.productId);
            if (p.stock !== null && p.stock === 0) {
                res.status(400).json({ success: false, message: `"${p.name}" est en rupture de stock` });
                return;
            }
            if (p.stock !== null && p.stock < item.qty) {
                res.status(400).json({ success: false, message: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock})` });
                return;
            }
        }
        // 2. Calculer les totaux
        const subtotal = body.items.reduce((sum, item) => {
            const p = products.find(p => p.id === item.productId);
            return sum + p.price * item.qty;
        }, 0);
        const shippingCost = (() => {
            if (subtotal >= 25_000)
                return 0; // livraison gratuite
            return body.deliveryMethod === 'express' ? 3_500 : 1_500;
        })();
        // 3. Récupérer le taux de TVA par défaut
        const defaultTax = await prisma_1.prisma.taxRate.findFirst({
            where: { isDefault: true, isActive: true },
        });
        const taxRatePercent = defaultTax?.rate ?? 0;
        const taxAmount = Math.round(subtotal * taxRatePercent / 100);
        // 4. Valider le code promo
        let promoDiscount = 0;
        let validatedCode = null;
        if (body.promoCode) {
            const now = new Date();
            const promo = await prisma_1.prisma.promoCode.findFirst({
                where: {
                    code: body.promoCode.toUpperCase(),
                    isActive: true,
                    AND: [
                        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                        { OR: [{ maxUses: null }, { maxUses: { gt: 0 } }] },
                    ],
                },
            });
            if (promo && subtotal >= promo.minOrder) {
                promoDiscount = promo.type === 'percent'
                    ? Math.round(subtotal * promo.value / 100)
                    : promo.value;
                validatedCode = promo.code;
                await prisma_1.prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
            }
        }
        const total = subtotal + taxAmount - promoDiscount + shippingCost;
        // Points gagnés : 1 point par 100 FCFA dépensés
        const pointsEarned = req.user?.userId ? Math.floor(total / 100) : 0;
        // 5. Créer la commande
        const orderNumber = generateOrderNumber();
        const order = await prisma_1.prisma.order.create({
            data: {
                orderNumber,
                userId: req.user?.userId ?? null,
                clientPrenom: body.clientPrenom,
                clientNom: body.clientNom,
                clientEmail: body.clientEmail,
                clientTelephone: body.clientTelephone,
                deliveryMethod: body.deliveryMethod,
                shippingAddress: JSON.stringify(body.shippingAddress),
                shippingCost,
                paymentMethod: body.paymentMethod,
                subtotal,
                taxRate: taxRatePercent,
                taxAmount,
                promoCode: validatedCode,
                promoDiscount,
                pointsEarned,
                total,
                notes: body.notes,
                items: {
                    create: body.items.map(item => {
                        const p = products.find(p => p.id === item.productId);
                        return {
                            productId: p.id,
                            name: p.name,
                            brand: p.brand,
                            price: p.price,
                            qty: item.qty,
                            image: p.images[0]?.url ?? '',
                            color: item.color,
                        };
                    }),
                },
            },
            include: { items: true },
        });
        // 5. Décrémenter le stock
        await Promise.all(body.items.map(item => prisma_1.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.qty }, sold: { increment: item.qty } },
        })));
        // 6a. Fidélité : créditer les points gagnés
        if (req.user?.userId && pointsEarned > 0) {
            await Promise.all([
                prisma_1.prisma.user.update({ where: { id: req.user.userId }, data: { loyaltyPoints: { increment: pointsEarned } } }),
                prisma_1.prisma.pointTransaction.create({
                    data: { userId: req.user.userId, orderId: order.id, type: 'earn', points: pointsEarned, note: `Gagnés sur commande ${orderNumber}` },
                }),
            ]);
        }
        // 6b. Notification en base (si utilisateur connecté)
        if (req.user?.userId) {
            const notifLines = [`Votre commande ${orderNumber} a bien été reçue.`];
            if (pointsEarned > 0)
                notifLines.push(`+${pointsEarned} points Skignas crédités !`);
            await prisma_1.prisma.notification.create({
                data: {
                    userId: req.user.userId,
                    type: 'order',
                    title: 'Commande reçue',
                    body: notifLines.join(' '),
                    link: `/commandes/${orderNumber}`,
                },
            });
        }
        // 7. Email de confirmation (sans bloquer)
        (0, mailer_1.sendOrderConfirmationEmail)(body.clientEmail, {
            orderNumber,
            prenom: body.clientPrenom,
            items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            subtotal,
            shippingCost,
            promoDiscount,
            total,
            paymentMethod: body.paymentMethod,
            deliveryMethod: body.deliveryMethod,
        }).catch(() => { });
        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: {
                orderNumber: order.orderNumber,
                orderId: order.id,
                total,
                shippingCost,
                promoDiscount,
                pointsEarned,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur lors de la création de la commande' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/orders  — Mes commandes
───────────────────────────────────────────────────────────── */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 10;
        const status = req.query['status'];
        const where = {
            userId: req.user.userId,
            ...(status ? { status } : {}),
        };
        const [total, orders] = await Promise.all([
            prisma_1.prisma.order.count({ where }),
            prisma_1.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    items: {
                        select: { id: true, name: true, qty: true, price: true, image: true },
                    },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                orders,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/orders/admin/all  [ADMIN]
   ⚠️  DOIT être déclaré AVANT /:id pour ne pas être masqué
───────────────────────────────────────────────────────────── */
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query['page']) || 1;
        const limit = parseInt(req.query['limit']) || 20;
        const status = req.query['status'];
        const q = req.query['q'];
        const where = {
            ...(status ? { status } : {}),
            ...(q ? { OR: [
                    { orderNumber: { contains: q } },
                    { clientEmail: { contains: q } },
                    { clientTelephone: { contains: q } },
                ] } : {}),
        };
        const [total, orders] = await Promise.all([
            prisma_1.prisma.order.count({ where }),
            prisma_1.prisma.order.findMany({
                where, orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit, take: limit,
                include: { items: { select: { name: true, qty: true, image: true } } },
            }),
        ]);
        res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/orders/:id  — Détail commande
───────────────────────────────────────────────────────────── */
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const paramId = req.params['id'] ?? '';
        const isAdmin = req.user?.role === 'admin';
        const order = await prisma_1.prisma.order.findFirst({
            where: {
                AND: [
                    // Cherche par id (CUID) OU par orderNumber (KLI-...)
                    { OR: [{ id: paramId }, { orderNumber: paramId }] },
                    // Admin → toutes les commandes
                    // Connecté non-admin → commande lui appartenant OU commande invité (userId null)
                    // Non connecté → commande invité seulement
                    ...(isAdmin
                        ? []
                        : req.user
                            ? [{ OR: [{ userId: req.user.userId }, { userId: null }] }]
                            : [{ userId: null }]),
                ],
            },
            include: { items: true },
        });
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
        }
        res.json({ success: true, data: order });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/cancel  — Annuler une commande
───────────────────────────────────────────────────────────── */
router.put('/:id/cancel', auth_1.requireAuth, async (req, res) => {
    try {
        const order = await prisma_1.prisma.order.findFirst({
            where: { OR: [{ id: req.params['id'] }, { orderNumber: req.params['id'] }], userId: req.user.userId },
        });
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
        }
        if (!['pending', 'confirmed'].includes(order.status)) {
            res.status(400).json({ success: false, message: 'Cette commande ne peut plus être annulée' });
            return;
        }
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
        res.json({ success: true, message: 'Commande annulée' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/status  [ADMIN]
───────────────────────────────────────────────────────────── */
router.put('/:id/status', auth_1.requireAdmin, async (req, res) => {
    try {
        const schema = zod_1.z.object({ status: zod_1.z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']) });
        const { status } = schema.parse(req.body);
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: req.params['id'] },
        });
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
        }
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status } });
        // Email de mise à jour
        (0, mailer_1.sendOrderStatusEmail)(order.clientEmail, order.clientPrenom, order.orderNumber, status).catch(() => { });
        // Notification si user connecté
        if (order.userId) {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: order.userId,
                    type: 'order',
                    title: `Commande ${order.orderNumber} mise à jour`,
                    body: `Nouveau statut : ${status}`,
                    link: `/commandes/${order.orderNumber}`,
                },
            });
        }
        res.json({ success: true, message: 'Statut mis à jour' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PATCH /api/orders/:id/status  [ADMIN] — alias PATCH ─── */
router.patch('/:id/status', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, message: 'Statut invalide' });
            return;
        }
        const order = await prisma_1.prisma.order.update({ where: { id }, data: { status } });
        res.json({ success: true, data: { order } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map