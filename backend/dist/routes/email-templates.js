"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* ─────────────────────────────────────────────────────────────
   Prévisualisation et personnalisation des templates email —
   feature admin permanente.

   Le HTML de prévisualisation est capturé via emailCaptureContext
   (AsyncLocalStorage, voir lib/email/client.ts) — un envoi réel
   concurrent ne peut jamais être intercepté par erreur.

   Le design (header, carte, footer) est piloté par des tokens
   (couleurs, rayon, logo, textes) validés par liste blanche et
   persistés en base (SiteSettings) — jamais sur disque, qui n'est
   pas garanti persistant en production (Railway). Voir lib/email/tokens.ts.
───────────────────────────────────────────────────────────── */
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const client_1 = require("../lib/email/client");
const tokens_1 = require("../lib/email/tokens");
const email_1 = require("../lib/email");
const flash_deal_1 = require("../lib/email/templates/flash-deal");
const logger_1 = require("../lib/logger");
const router = (0, express_1.Router)();
router.use(auth_1.requireAdmin);
const DUMMY_ORDER_ITEMS = [
    { name: 'Casque Bluetooth Pro X', qty: 1, price: 25000 },
    { name: 'Coque de protection', qty: 2, price: 3000 },
];
const TEMPLATES = {
    welcome: () => (0, email_1.sendWelcomeEmail)('preview@example.com', 'Awa'),
    'magic-link': () => (0, email_1.sendMagicLinkEmail)('preview@example.com', 'Awa', 'https://skignas.com/auth/magic?token=preview'),
    'password-reset': () => (0, email_1.sendPasswordResetEmail)('preview@example.com', 'Awa', 'https://skignas.com/reinitialiser-mot-de-passe?token=preview'),
    'password-changed': () => (0, email_1.sendPasswordChangedEmail)('preview@example.com', 'Awa', '102.23.45.67'),
    'order-confirmation': () => (0, email_1.sendOrderConfirmationEmail)('preview@example.com', {
        orderNumber: 'SKG-00042', prenom: 'Awa', items: DUMMY_ORDER_ITEMS,
        total: 34500, shippingCost: 1500, subtotal: 33000,
        paymentMethod: 'orange', deliveryMethod: 'standard',
    }),
    'order-status-confirmed': () => (0, email_1.sendOrderStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'confirmed'),
    'order-status-shipped': () => (0, email_1.sendOrderStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'shipped'),
    'order-status-delivered': () => (0, email_1.sendOrderStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'delivered'),
    'order-status-cancelled': () => (0, email_1.sendOrderStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'cancelled'),
    'contact-reply': () => (0, email_1.sendContactReply)('preview@example.com', 'Awa', 'Question sur ma commande'),
    broadcast: () => (0, email_1.sendBroadcastEmail)('preview@example.com', 'Awa', 'Nouvelle collection disponible', 'Découvrez nos derniers arrivages tech à prix imbattables cette semaine seulement.'),
    'new-order-admin': () => (0, email_1.sendNewOrderAdminEmail)('preview@example.com', {
        orderNumber: 'SKG-00042', clientNom: 'Awa Koné', clientTelephone: '+225 07 00 00 00 00',
        clientEmail: 'awa@example.com', items: DUMMY_ORDER_ITEMS, total: 34500,
        paymentMethod: 'orange', deliveryMethod: 'standard', orderId: 'clxxxxxxxxxxxxxx',
    }),
    'new-product-request-admin': () => (0, email_1.sendNewProductRequestAdminEmail)('preview@example.com', {
        id: 'clxxxxxxxxxxxxxx', productName: 'Console rétro portable', description: 'Je cherche une console de jeu rétro portable, neuve ou reconditionnée.',
        clientNom: 'Awa Koné', clientEmail: 'awa@example.com', clientTelephone: '+225 07 00 00 00 00',
        quantity: 1, budget: 40000, deliveryAddress: 'Cocody, Abidjan',
    }),
    'product-request-reply': () => (0, email_1.sendProductRequestReplyEmail)('preview@example.com', 'Awa', 'Console rétro portable', 'Bonjour, nous avons trouvé ce modèle disponible sous 5 jours.', 38000),
    'flash-deal': () => (0, flash_deal_1.sendFlashDealEmail)('preview@example.com', 'Awa', [
        { id: 1, name: 'Casque Bluetooth Pro X', image: 'https://m.media-amazon.com/images/I/61dB1oxSpUL._AC_SL1500_.jpg', price: 25000, salePrice: 18000 },
        { id: 2, name: 'Enceinte portable', image: 'https://m.media-amazon.com/images/I/71rP1hs8caL._AC_SL1500_.jpg', price: 15000, salePrice: 11000 },
    ], new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    'return-requested': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'requested'),
    'return-approved': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'approved'),
    'return-rejected': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'rejected', 'Article reçu hors délai de 14 jours'),
    'return-received': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'received'),
    'return-refunded': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'refunded'),
    'return-cancelled': () => (0, email_1.sendReturnStatusEmail)('preview@example.com', 'Awa', 'SKG-00042', 'cancelled'),
    'new-return-admin': () => (0, email_1.sendNewReturnAdminEmail)('preview@example.com', {
        orderNumber: 'SKG-00042', clientNom: 'Awa Koné', clientEmail: 'awa@example.com',
        reason: 'defective', itemsLabel: 'Casque Bluetooth Pro X ×1', returnId: 'clxxxxxxxxxxxxxx',
    }),
};
/* ── GET /api/email-templates — liste des templates disponibles ── */
router.get('/', (_req, res) => {
    res.json({ success: true, data: { templates: Object.keys(TEMPLATES) } });
});
/* ─────────────────────────────────────────────────────────────
   GET /api/email-templates/:name — rendu HTML réel (aucun envoi)
   ?tokens=<json>  — optionnel, aperçu avec des tokens "brouillon"
   pas encore sauvegardés (validés par la même liste blanche, isolé
   par requête — n'affecte jamais un autre appel concurrent).
───────────────────────────────────────────────────────────── */
router.get('/:name', async (req, res) => {
    const name = req.params['name'];
    const fn = TEMPLATES[name];
    if (!fn) {
        res.status(404).json({ success: false, message: 'Template inconnu: ' + name });
        return;
    }
    let draftTokens;
    const rawTokens = req.query['tokens'];
    if (typeof rawTokens === 'string') {
        try {
            const parsed = JSON.parse(rawTokens);
            if (parsed && typeof parsed === 'object')
                draftTokens = (0, tokens_1.sanitizeTokens)(parsed);
        }
        catch { /* JSON invalide → ignoré, on garde le design sauvegardé */ }
    }
    const capture = { html: '' };
    try {
        await client_1.emailCaptureContext.run(capture, async () => {
            if (draftTokens) {
                await tokens_1.tokenPreviewContext.run(draftTokens, () => fn());
            }
            else {
                await fn();
            }
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(capture.html || '<p>Aucun HTML capturé.</p>');
    }
    catch (err) {
        logger_1.logger.error('[EMAIL-TEMPLATES]', err);
        res.status(500).send('<p>Erreur lors du rendu de ce template — voir les logs serveur.</p>');
    }
});
/* ─────────────────────────────────────────────────────────────
   Design tokens partagés par tous les emails — persistés en base
   (SiteSettings), jamais sur disque (non garanti persistant en
   production). Validation stricte : toute valeur non conforme à
   la liste blanche est rejetée en 400, jamais silencieusement
   corrigée (contrairement à l'aperçu, où un repli discret est
   préférable pour ne jamais casser l'affichage).
───────────────────────────────────────────────────────────── */
router.get('/design/tokens', async (_req, res) => {
    const tokens = await (0, tokens_1.getRawEmailTokens)();
    res.json({ success: true, data: { tokens } });
});
const tokensSchema = zod_1.z.object({
    primaryColor: zod_1.z.string().regex(tokens_1.HEX_COLOR_RE, 'Couleur hexadécimale invalide (ex: #1a73e8)'),
    headerGradientFrom: zod_1.z.string().regex(tokens_1.HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
    headerGradientTo: zod_1.z.string().regex(tokens_1.HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
    cardRadius: zod_1.z.coerce.number().int().min(0).max(40),
    cardBg: zod_1.z.string().regex(tokens_1.HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
    bodyBg: zod_1.z.string().regex(tokens_1.HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
    footerText: zod_1.z.string().min(1).max(200),
    logoUrl: zod_1.z.string().regex(tokens_1.HTTPS_URL_RE, 'URL invalide (https uniquement)'),
    logoWidth: zod_1.z.coerce.number().int().min(10).max(600),
    logoHeight: zod_1.z.coerce.number().int().min(10).max(600),
    badgeText: zod_1.z.string().min(1).max(40),
}).partial();
router.put('/design/tokens', (0, validate_1.validate)(tokensSchema), async (req, res) => {
    const tokens = req.body;
    await prisma_1.prisma.siteSettings.upsert({
        where: { id: 1 },
        create: {
            emailPrimaryColor: tokens.primaryColor, emailHeaderGradientFrom: tokens.headerGradientFrom,
            emailHeaderGradientTo: tokens.headerGradientTo, emailCardRadius: tokens.cardRadius,
            emailCardBg: tokens.cardBg, emailBodyBg: tokens.bodyBg, emailFooterText: tokens.footerText,
            emailLogoUrl: tokens.logoUrl, emailLogoWidth: tokens.logoWidth, emailLogoHeight: tokens.logoHeight,
            emailBadgeText: tokens.badgeText,
        },
        update: {
            ...(tokens.primaryColor !== undefined && { emailPrimaryColor: tokens.primaryColor }),
            ...(tokens.headerGradientFrom !== undefined && { emailHeaderGradientFrom: tokens.headerGradientFrom }),
            ...(tokens.headerGradientTo !== undefined && { emailHeaderGradientTo: tokens.headerGradientTo }),
            ...(tokens.cardRadius !== undefined && { emailCardRadius: tokens.cardRadius }),
            ...(tokens.cardBg !== undefined && { emailCardBg: tokens.cardBg }),
            ...(tokens.bodyBg !== undefined && { emailBodyBg: tokens.bodyBg }),
            ...(tokens.footerText !== undefined && { emailFooterText: tokens.footerText }),
            ...(tokens.logoUrl !== undefined && { emailLogoUrl: tokens.logoUrl }),
            ...(tokens.logoWidth !== undefined && { emailLogoWidth: tokens.logoWidth }),
            ...(tokens.logoHeight !== undefined && { emailLogoHeight: tokens.logoHeight }),
            ...(tokens.badgeText !== undefined && { emailBadgeText: tokens.badgeText }),
        },
    });
    res.json({ success: true, message: 'Design enregistré — appliqué à tous les emails à partir de maintenant.' });
});
router.delete('/design/tokens', async (_req, res) => {
    await prisma_1.prisma.siteSettings.upsert({
        where: { id: 1 },
        create: {},
        update: {
            emailPrimaryColor: null, emailHeaderGradientFrom: null, emailHeaderGradientTo: null,
            emailCardRadius: null, emailCardBg: null, emailBodyBg: null,
            emailFooterText: null, emailLogoUrl: null, emailLogoWidth: null, emailLogoHeight: null,
            emailBadgeText: null,
        },
    });
    res.json({ success: true, message: 'Design par défaut restauré.' });
});
exports.default = router;
//# sourceMappingURL=email-templates.js.map