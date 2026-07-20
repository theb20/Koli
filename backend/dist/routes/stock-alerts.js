"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
/* POST /api/stock-alerts — s'abonner */
router.post('/', auth_1.optionalAuth, async (req, res) => {
    try {
        const { productId, email } = zod_1.z.object({
            productId: zod_1.z.number().int().positive(),
            email: zod_1.z.string().email(),
        }).parse(req.body);
        const product = await prisma_1.prisma.product.findUnique({
            where: { id: productId, isActive: true },
            select: { id: true, stock: true, name: true },
        });
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit introuvable.' });
            return;
        }
        if (product.stock > 0) {
            res.status(400).json({ success: false, message: 'Ce produit est déjà en stock !' });
            return;
        }
        await prisma_1.prisma.stockAlert.upsert({
            where: { email_productId: { email: email.toLowerCase(), productId } },
            update: { sent: false },
            create: {
                email: email.toLowerCase(),
                productId,
                userId: req.user?.userId ?? null,
                sent: false,
            },
        });
        res.json({ success: true, message: `Vous serez alerté(e) dès que "${product.name}" sera de nouveau disponible.` });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* DELETE /api/stock-alerts/:productId — se désabonner */
router.delete('/:productId', auth_1.optionalAuth, (0, validate_1.validateParams)(validate_1.zProductIdParam), async (req, res) => {
    try {
        const { email } = zod_1.z.object({ email: zod_1.z.string().email() }).parse(req.body);
        const productId = Number(req.params['productId']);
        await prisma_1.prisma.stockAlert.deleteMany({
            where: { email: email.toLowerCase(), productId },
        });
        res.json({ success: true, message: 'Alerte supprimée.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* GET /api/stock-alerts/check/:productId — vérifier si alerte active */
router.get('/check/:productId', auth_1.optionalAuth, (0, validate_1.validateParams)(validate_1.zProductIdParam), async (req, res) => {
    try {
        const productId = Number(req.params['productId']);
        const { email } = zod_1.z.object({ email: zod_1.z.string().email() }).parse(req.query);
        const alert = await prisma_1.prisma.stockAlert.findUnique({
            where: { email_productId: { email: email.toLowerCase(), productId } },
        });
        res.json({ success: true, data: { subscribed: !!alert && !alert.sent } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=stock-alerts.js.map