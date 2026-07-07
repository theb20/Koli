"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cache_1 = require("../middleware/cache");
const router = (0, express_1.Router)();
/** Accepte "+225 07 00 00 00 00", "225-07-00-00-00-00", etc. → ne garde que les chiffres */
const zDigitsOnly = zod_1.z.string().transform(v => v.replace(/\D/g, '')).pipe(zod_1.z.string().min(8, 'Numéro invalide'));
/** Accepte "facebook.com/skignas" ou "https://facebook.com/skignas" */
const zLooseUrl = zod_1.z.string().trim().transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .pipe(zod_1.z.string().url('URL invalide').optional().or(zod_1.z.literal('')));
const settingsSchema = zod_1.z.object({
    supportPhone: zod_1.z.string().min(1),
    whatsappNumber: zDigitsOnly,
    supportEmail: zod_1.z.string().email(),
    contactEmail: zod_1.z.string().email(),
    address: zod_1.z.string().min(1),
    facebookUrl: zLooseUrl,
    instagramUrl: zLooseUrl,
    youtubeUrl: zLooseUrl,
    tiktokUrl: zLooseUrl,
});
/* ── GET /api/settings  — public (consommé par le site client) ── */
router.get('/', (0, cache_1.cacheControl)(300), async (_req, res) => {
    try {
        const settings = await prisma_1.prisma.siteSettings.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1 },
        });
        res.json({ success: true, data: { settings } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ── PUT /api/settings  [ADMIN] ─────────────────────────────── */
router.put('/', auth_1.requireAdmin, (0, validate_1.validate)(settingsSchema.partial()), async (req, res) => {
    try {
        const data = req.body;
        const settings = await prisma_1.prisma.siteSettings.upsert({
            where: { id: 1 },
            update: data,
            create: { id: 1, ...data },
        });
        res.json({ success: true, data: { settings } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map