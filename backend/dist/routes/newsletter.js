"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
const schema = zod_1.z.object({
    email: zod_1.z.string().email('Adresse e-mail invalide'),
});
/* ── POST /api/newsletter/subscribe ─────────────────────────── */
/* Inscription newsletter — utilisateur inscrit ou visiteur      */
router.post('/subscribe', async (req, res) => {
    try {
        const { email } = schema.parse(req.body);
        // Si l'email correspond à un compte existant → activer subscribedToNewsletter
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, subscribedToNewsletter: true },
        });
        if (user) {
            if (!user.subscribedToNewsletter) {
                await prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { subscribedToNewsletter: true },
                });
            }
            res.json({
                success: true,
                message: 'Votre abonnement newsletter a été activé.',
                alreadyUser: true,
            });
            return;
        }
        // Visiteur non inscrit → stocker dans la table newsletter
        await prisma_1.prisma.newsletterSubscriber.upsert({
            where: { email: email.toLowerCase() },
            update: { subscribedAt: new Date() }, // re-subscribe si déjà existant
            create: { email: email.toLowerCase() },
        });
        res.json({
            success: true,
            message: 'Inscription confirmée ! Vous recevrez nos meilleures offres.',
            alreadyUser: false,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0]?.message ?? 'Email invalide' });
            return;
        }
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── GET /api/newsletter/subscribers  [ADMIN optionnel] ─────── */
router.get('/subscribers', async (_req, res) => {
    try {
        const [users, guests] = await Promise.all([
            prisma_1.prisma.user.count({ where: { subscribedToNewsletter: true } }),
            prisma_1.prisma.newsletterSubscriber.count(),
        ]);
        res.json({ success: true, data: { users, guests, total: users + guests } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=newsletter.js.map