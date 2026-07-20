"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const mailer_1 = require("../lib/mailer");
const invoicePdf_1 = require("../lib/invoicePdf");
const newOrderNotification_1 = require("../lib/whatsapp/newOrderNotification");
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
    // Idempotence — même clé envoyée deux fois (double-clic, retry réseau) → même commande renvoyée
    clientRequestId: zod_1.z.string().uuid().optional(),
});
/** Levée quand le stock a été vidé par une autre commande concurrente pendant la transaction. */
class StockError extends Error {
    constructor(productName) {
        super(`Stock insuffisant pour "${productName}"`);
    }
}
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
/**
 * Applique un changement de statut de commande de façon cohérente :
 * — restitue le stock une seule fois si la commande passe à annulée/remboursée
 *   (et ne le refait pas si elle l'était déjà, pour éviter un double crédit) ;
 * — maintient paymentStatus aligné avec l'avancement. Il n'y a pas d'intégration
 *   de passerelle de paiement réelle ici : la progression du statut par un admin
 *   fait office de confirmation manuelle du paiement.
 */
async function applyOrderStatusChange(orderId, status) {
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order)
            return null;
        const wasFinalized = order.status === 'cancelled' || order.status === 'refunded';
        const becomingFinalized = status === 'cancelled' || status === 'refunded';
        if (becomingFinalized && !wasFinalized) {
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.qty }, sold: { decrement: item.qty } },
                });
            }
        }
        const paymentStatus = status === 'refunded' ? 'refunded'
            : ['confirmed', 'processing', 'shipped', 'delivered'].includes(status) ? 'paid'
                : order.paymentStatus; // 'pending'/'cancelled' : ne pas inventer un statut de paiement
        // Verrouillé à la première livraison — base du calcul d'éligibilité au retour.
        const deliveredAt = status === 'delivered' && order.status !== 'delivered' ? new Date() : undefined;
        const updated = await tx.order.update({ where: { id: orderId }, data: { status, paymentStatus, deliveredAt } });
        return { updated, changed: order.status !== status };
    });
    if (!result)
        return null;
    // Email + notification client à chaque changement réel de statut — non bloquant, ne doit
    // jamais faire échouer la mise à jour si l'envoi échoue. Pas de mail si le statut est
    // resté identique (ex: admin renvoie la même valeur par erreur).
    if (result.changed) {
        (0, mailer_1.sendOrderStatusEmail)(result.updated.clientEmail, result.updated.clientPrenom, result.updated.orderNumber, status).catch(() => { });
        if (result.updated.userId) {
            prisma_1.prisma.notification.create({
                data: {
                    userId: result.updated.userId,
                    type: 'order',
                    title: `Commande ${result.updated.orderNumber} mise à jour`,
                    body: `Nouveau statut : ${status}`,
                    link: `/commandes/${result.updated.orderNumber}`,
                },
            }).catch(() => { });
        }
    }
    return result.updated;
}
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
        // 0bis. Idempotence — requête déjà traitée (double-clic, retry réseau) → renvoyer la commande existante
        if (body.clientRequestId) {
            const existing = await prisma_1.prisma.order.findUnique({ where: { clientRequestId: body.clientRequestId } });
            if (existing) {
                res.status(200).json({
                    success: true,
                    message: 'Commande déjà créée',
                    data: {
                        orderNumber: existing.orderNumber,
                        orderId: existing.id,
                        total: existing.total,
                        shippingCost: existing.shippingCost,
                        promoDiscount: existing.promoDiscount,
                        pointsEarned: existing.pointsEarned,
                    },
                });
                return;
            }
        }
        // 1. Récupérer les produits (infos affichage + pré-vérification amicale du stock)
        const productIds = body.items.map(i => i.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            include: { images: { take: 1, orderBy: { position: 'asc' } } },
        });
        if (products.length !== productIds.length) {
            res.status(400).json({ success: false, message: 'Un ou plusieurs produits sont introuvables' });
            return;
        }
        // Pré-vérification — message amical immédiat. Le garde-fou réel (contre les accès
        // concurrents) est la décrémentation atomique faite plus bas, dans la transaction.
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
        // 4. Valider le code promo (lecture) — l'application définitive (et le contrôle du
        //    quota d'utilisation contre les accès concurrents) se fait dans la transaction plus bas.
        let promoDiscount = 0;
        let validatedCode = null;
        let promoId = null;
        let promoMaxUses = null;
        if (body.promoCode) {
            const now = new Date();
            const promo = await prisma_1.prisma.promoCode.findFirst({
                where: {
                    code: body.promoCode.toUpperCase(),
                    isActive: true,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
            });
            const quotaOk = !promo || promo.maxUses == null || promo.usedCount < promo.maxUses;
            if (promo && quotaOk && subtotal >= promo.minOrder) {
                promoDiscount = promo.type === 'percent'
                    ? Math.round(subtotal * promo.value / 100)
                    : promo.value;
                validatedCode = promo.code;
                promoId = promo.id;
                promoMaxUses = promo.maxUses;
            }
        }
        // Points gagnés : 1 point par 100 FCFA dépensés (calcul optimiste, ajusté si la promo est perdue dans la course)
        const orderNumber = generateOrderNumber();
        // 5. Transaction — décrémentation de stock + réservation du code promo + création de la
        //    commande sont tout-ou-rien : soit tout réussit ensemble, soit rien n'est appliqué.
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            // Décrémentation atomique du stock — la vraie garantie contre la survente.
            // "stock >= qty" et la décrémentation se font dans la même requête ; Postgres sérialise
            // les accès concurrents sur la même ligne, donc deux commandes ne peuvent jamais toutes
            // les deux réussir sur le dernier exemplaire disponible.
            for (const item of body.items) {
                const updated = await tx.product.updateMany({
                    where: { id: item.productId, stock: { gte: item.qty } },
                    data: { stock: { decrement: item.qty }, sold: { increment: item.qty } },
                });
                if (updated.count === 0) {
                    const p = products.find(pr => pr.id === item.productId);
                    throw new StockError(p?.name ?? String(item.productId));
                }
            }
            // Réservation atomique du code promo — même logique que le stock : si un autre client
            // a épuisé le quota entre-temps, on annule juste la remise (pas toute la commande).
            let finalPromoDiscount = promoDiscount;
            let finalPromoCode = validatedCode;
            if (promoId !== null) {
                const promoUpdate = await tx.promoCode.updateMany({
                    where: {
                        id: promoId,
                        ...(promoMaxUses != null ? { usedCount: { lt: promoMaxUses } } : {}),
                    },
                    data: { usedCount: { increment: 1 } },
                });
                if (promoUpdate.count === 0) {
                    finalPromoDiscount = 0;
                    finalPromoCode = null;
                }
            }
            const finalTotal = subtotal + taxAmount - finalPromoDiscount + shippingCost;
            const finalPointsEarned = req.user?.userId ? Math.floor(finalTotal / 100) : 0;
            return tx.order.create({
                data: {
                    orderNumber,
                    clientRequestId: body.clientRequestId,
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
                    promoCode: finalPromoCode,
                    promoDiscount: finalPromoDiscount,
                    pointsEarned: finalPointsEarned,
                    total: finalTotal,
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
        });
        // 6a. Fidélité : créditer les points réellement gagnés (après résolution de la promo)
        if (req.user?.userId && order.pointsEarned > 0) {
            await Promise.all([
                prisma_1.prisma.user.update({ where: { id: req.user.userId }, data: { loyaltyPoints: { increment: order.pointsEarned } } }),
                prisma_1.prisma.pointTransaction.create({
                    data: { userId: req.user.userId, orderId: order.id, type: 'earn', points: order.pointsEarned, note: `Gagnés sur commande ${orderNumber}` },
                }),
            ]);
        }
        // 6b. Notification en base (si utilisateur connecté)
        if (req.user?.userId) {
            const notifLines = [`Votre commande ${orderNumber} a bien été reçue.`];
            if (order.pointsEarned > 0)
                notifLines.push(`+${order.pointsEarned} points Skignas crédités !`);
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
        // 6c. Sauvegarder l'adresse de livraison dans le carnet d'adresses si elle est nouvelle —
        //     évite les doublons en comparant ville + adresse + téléphone (normalisés).
        if (req.user?.userId) {
            try {
                const norm = (s) => s.trim().toLowerCase();
                const existingAddresses = await prisma_1.prisma.address.findMany({ where: { userId: req.user.userId } });
                const isDuplicate = existingAddresses.some(a => norm(a.ville) === norm(body.shippingAddress.ville) &&
                    norm(a.adresse) === norm(body.shippingAddress.adresse) &&
                    norm(a.telephone) === norm(body.clientTelephone));
                if (!isDuplicate) {
                    await prisma_1.prisma.address.create({
                        data: {
                            userId: req.user.userId,
                            label: 'Autre',
                            prenom: body.clientPrenom,
                            nom: body.clientNom,
                            telephone: body.clientTelephone,
                            ville: body.shippingAddress.ville,
                            quartier: body.shippingAddress.quartier,
                            adresse: body.shippingAddress.adresse,
                            isDefault: existingAddresses.length === 0,
                        },
                    });
                }
            }
            catch (err) {
                console.error('[orders] échec sauvegarde adresse auto', err); // non bloquant
            }
        }
        // 6d. Notifier les administrateurs — bulle in-app + email(s) configurés dans les paramètres.
        //     Ne bloque jamais la réponse au client si ça échoue.
        ;
        (async () => {
            try {
                const admins = await prisma_1.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
                if (admins.length > 0) {
                    await prisma_1.prisma.notification.createMany({
                        data: admins.map(a => ({
                            userId: a.id,
                            type: 'order',
                            title: 'Nouvelle commande',
                            body: `${body.clientPrenom} ${body.clientNom} · ${order.total.toLocaleString('fr-FR')} FCFA · ${orderNumber}`,
                            link: `/orders/${order.id}`,
                        })),
                    });
                }
                const settings = await prisma_1.prisma.siteSettings.findUnique({ where: { id: 1 }, select: { orderNotifyEmails: true, whatsappNumber: true } });
                const recipients = (settings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean);
                await Promise.allSettled(recipients.map(email => (0, mailer_1.sendNewOrderAdminEmail)(email, {
                    orderNumber,
                    clientNom: `${body.clientPrenom} ${body.clientNom}`,
                    clientTelephone: body.clientTelephone,
                    clientEmail: body.clientEmail,
                    items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                    total: order.total,
                    paymentMethod: body.paymentMethod,
                    deliveryMethod: body.deliveryMethod,
                    orderId: order.id,
                })));
                // Notification WhatsApp équipe — best-effort, silencieuse tant que
                // WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID ne sont pas configurés.
                if (settings?.whatsappNumber) {
                    (0, newOrderNotification_1.sendNewOrderWhatsAppNotification)(settings.whatsappNumber, {
                        orderNumber,
                        orderId: order.id,
                        clientNom: `${body.clientPrenom} ${body.clientNom}`,
                        clientTelephone: body.clientTelephone,
                        total: order.total,
                        paymentMethod: body.paymentMethod,
                    }).catch(err => console.error('[orders] échec notification WhatsApp', err));
                }
            }
            catch (err) {
                console.error('[orders] échec notification admin', err); // non bloquant
            }
        })();
        // 7. Email de confirmation (sans bloquer)
        (0, mailer_1.sendOrderConfirmationEmail)(body.clientEmail, {
            orderNumber,
            prenom: body.clientPrenom,
            items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            subtotal,
            shippingCost,
            promoDiscount: order.promoDiscount,
            total: order.total,
            paymentMethod: body.paymentMethod,
            deliveryMethod: body.deliveryMethod,
        }).catch(() => { });
        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: {
                orderNumber: order.orderNumber,
                orderId: order.id,
                total: order.total,
                shippingCost: order.shippingCost,
                promoDiscount: order.promoDiscount,
                pointsEarned: order.pointsEarned,
            },
        });
    }
    catch (err) {
        if (err instanceof StockError) {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        // Idempotence : deux requêtes concurrentes avec la même clientRequestId — la seconde
        // percute la contrainte unique plutôt que le pré-check (fenêtre de course très étroite).
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
            const clientRequestId = req.body.clientRequestId;
            const existing = clientRequestId
                ? await prisma_1.prisma.order.findUnique({ where: { clientRequestId } })
                : null;
            if (existing) {
                res.status(200).json({
                    success: true,
                    message: 'Commande déjà créée',
                    data: {
                        orderNumber: existing.orderNumber,
                        orderId: existing.id,
                        total: existing.total,
                        shippingCost: existing.shippingCost,
                        promoDiscount: existing.promoDiscount,
                        pointsEarned: existing.pointsEarned,
                    },
                });
                return;
            }
        }
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
   GET /api/orders/:id/invoice  — Facture PDF
   Même règle d'accès que GET /:id (propriétaire, commande invité, ou admin).
───────────────────────────────────────────────────────────── */
router.get('/:id/invoice', auth_1.optionalAuth, async (req, res) => {
    try {
        const paramId = req.params['id'] ?? '';
        const isAdmin = req.user?.role === 'admin';
        const order = await prisma_1.prisma.order.findFirst({
            where: {
                AND: [
                    { OR: [{ id: paramId }, { orderNumber: paramId }] },
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
        const settings = await prisma_1.prisma.siteSettings.upsert({ where: { id: 1 }, create: {}, update: {} });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="facture-${order.orderNumber}.pdf"`);
        const doc = (0, invoicePdf_1.buildInvoicePdf)(order, settings);
        doc.pipe(res);
        doc.end();
    }
    catch (err) {
        console.error('[INVOICE]', err);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération de la facture' });
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
        await applyOrderStatusChange(order.id, 'cancelled');
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
        const schema = zod_1.z.object({ status: zod_1.z.enum(ORDER_STATUSES) });
        const { status } = schema.parse(req.body);
        const order = await applyOrderStatusChange(req.params['id'], status);
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
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
        const schema = zod_1.z.object({ status: zod_1.z.enum(ORDER_STATUSES) });
        const { status } = schema.parse(req.body);
        const order = await applyOrderStatusChange(req.params['id'], status);
        if (!order) {
            res.status(404).json({ success: false, message: 'Commande introuvable' });
            return;
        }
        res.json({ success: true, data: { order } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map