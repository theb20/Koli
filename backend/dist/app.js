"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = require("express-rate-limit");
const path_1 = __importDefault(require("path"));
const allowedOrigins_1 = require("./lib/allowedOrigins");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const addresses_1 = __importDefault(require("./routes/addresses"));
const wishlist_1 = __importDefault(require("./routes/wishlist"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const contact_1 = __importDefault(require("./routes/contact"));
const promo_1 = __importDefault(require("./routes/promo"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const blog_1 = __importDefault(require("./routes/blog"));
const stores_1 = __importDefault(require("./routes/stores"));
const categories_1 = __importDefault(require("./routes/categories"));
const tax_1 = __importDefault(require("./routes/tax"));
const newsletter_1 = __importDefault(require("./routes/newsletter"));
const loyalty_1 = __importDefault(require("./routes/loyalty"));
const flash_1 = __importDefault(require("./routes/flash"));
const stock_alerts_1 = __importDefault(require("./routes/stock-alerts"));
const referral_1 = __importDefault(require("./routes/referral"));
const gift_lists_1 = __importDefault(require("./routes/gift-lists"));
const delivery_1 = __importDefault(require("./routes/delivery"));
const history_1 = __importDefault(require("./routes/history"));
const seller_1 = __importDefault(require("./routes/seller"));
const settings_1 = __importDefault(require("./routes/settings"));
const deal_announcements_1 = __importDefault(require("./routes/deal-announcements"));
const product_requests_1 = __importDefault(require("./routes/product-requests"));
const email_templates_1 = __importDefault(require("./routes/email-templates"));
const returns_1 = __importDefault(require("./routes/returns"));
const app = (0, express_1.default)();
/* ── CORS (must be before helmet) ──────────────────────────── */
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow requests with no origin (mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins_1.ALLOWED_ORIGINS.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true, // cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
/* ── Compression gzip — réduit la taille des réponses JSON ────── */
app.use((0, compression_1.default)());
/* ── Sécurité ───────────────────────────────────────────────── */
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
/* ── Rate Limiting ──────────────────────────────────────────── */
// Global — toutes les routes (confortable en dev, suffisant en prod light)
app.use((0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 500, // augmenté : les SPA font beaucoup de requêtes légitimes
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
    skip: (req) => req.method === 'GET', // les GET ne consomment pas le quota global
}));
// Auth actions sensibles uniquement (login / register / mot de passe / magic link)
// NE s'applique PAS à /me, /profile, /sessions (lectures normales)
const authActionLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 tentatives par IP / 15 min — suffisant sans bloquer l'usage normal
    message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes' },
    keyGenerator: (req) => req.ip ?? 'unknown',
});
// Formulaires publics qui déclenchent un envoi d'email ou une écriture disque
// (contact, demande de sourcing, upload d'images) — cible anti-spam/anti-DoS,
// plus stricte que la limite globale généreuse ci-dessus.
const publicFormLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Trop de demandes envoyées, réessayez dans 15 minutes' },
    keyGenerator: (req) => req.ip ?? 'unknown',
    // Ne cible que les soumissions publiques (POST) — laisse passer les GET/PATCH/DELETE
    // admin (listing, statut...) qui utilisent déjà requireAdmin comme garde-fou et sont
    // parfois interrogés fréquemment (badge de notification, polling).
    skip: (req) => req.method !== 'POST',
});
// Lecture du catalogue public (produits, catégories, blog) — le limiteur global
// exempte volontairement les GET (usage normal très fréquent), ce qui laissait
// la voie libre à l'aspiration automatisée du catalogue. Plafond généreux pour
// un visiteur normal, mais qui ralentit fortement un scraping en masse.
const publicDataLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
    keyGenerator: (req) => req.ip ?? 'unknown',
    // les écritures admin (POST/PUT/PATCH/DELETE) restent protégées par requireAdmin uniquement
    skip: (req) => req.method !== 'GET' && req.method !== 'HEAD',
});
/* ── Parsers ────────────────────────────────────────────────── */
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
/* ── Logging ────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
/* ── Static (uploads) ───────────────────────────────────────── */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
app.use('/uploads', express_1.default.static(path_1.default.resolve(UPLOAD_DIR)));
/* ── Health check ───────────────────────────────────────────── */
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'OK',
        version: '1.0.0',
        ts: new Date().toISOString(),
        // cwd/uploadDir : diagnostic pour vérifier que le point de montage du
        // volume persistant Railway correspond bien au dossier réellement utilisé
        // par le serveur (uploads/products a été effacé à plusieurs reprises).
        cwd: process.cwd(),
        uploadDir: path_1.default.resolve(UPLOAD_DIR),
    });
});
/* ── Routes API ─────────────────────────────────────────────── */
// Limiteur strict sur les actions sensibles seulement (pas sur /me, /sessions, /profile)
app.use('/api/auth/login', authActionLimiter);
app.use('/api/auth/register', authActionLimiter);
app.use('/api/auth/forgot-password', authActionLimiter);
app.use('/api/auth/reset-password', authActionLimiter);
app.use('/api/auth/magic', authActionLimiter);
app.use('/api/auth/password', authActionLimiter);
app.use('/api/auth', auth_1.default);
app.use('/api/products', publicDataLimiter, products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/addresses', addresses_1.default);
app.use('/api/wishlist', wishlist_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/contact', publicFormLimiter, contact_1.default);
app.use('/api/promo', promo_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/blog', publicDataLimiter, blog_1.default);
app.use('/api/stores', stores_1.default);
app.use('/api/categories', publicDataLimiter, categories_1.default);
app.use('/api/tax', tax_1.default);
app.use('/api/newsletter', newsletter_1.default);
app.use('/api/loyalty', loyalty_1.default);
app.use('/api/flash', publicDataLimiter, flash_1.default);
app.use('/api/stock-alerts', stock_alerts_1.default);
app.use('/api/referral', referral_1.default);
app.use('/api/gift-lists', gift_lists_1.default);
app.use('/api/delivery', delivery_1.default);
app.use('/api/history', history_1.default);
app.use('/api/seller', seller_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/deal-announcements', deal_announcements_1.default);
app.use('/api/product-requests', publicFormLimiter, product_requests_1.default);
app.use('/api/email-templates', email_templates_1.default);
app.use('/api/returns', returns_1.default);
/* ── 404 ────────────────────────────────────────────────────── */
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route introuvable' });
});
/* ── Error handler global ───────────────────────────────────── */
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
});
exports.default = app;
//# sourceMappingURL=app.js.map