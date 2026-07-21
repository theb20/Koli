import * as Sentry from '@sentry/node'
import { expressErrorHandler } from '@appsignal/nodejs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import { slowDown } from 'express-slow-down'
import hpp from 'hpp'
import path from 'path'
import { ALLOWED_ORIGINS } from './lib/allowedOrigins'
import { logger } from './lib/logger'

// Routes
import authRouter          from './routes/auth'
import productsRouter      from './routes/products'
import ordersRouter        from './routes/orders'
import addressesRouter     from './routes/addresses'
import wishlistRouter      from './routes/wishlist'
import reviewsRouter       from './routes/reviews'
import contactRouter       from './routes/contact'
import promoRouter         from './routes/promo'
import notificationsRouter from './routes/notifications'
import blogRouter          from './routes/blog'
import storesRouter        from './routes/stores'
import categoriesRouter    from './routes/categories'
import taxRouter           from './routes/tax'
import newsletterRouter    from './routes/newsletter'
import loyaltyRouter      from './routes/loyalty'
import flashRouter        from './routes/flash'
import stockAlertsRouter  from './routes/stock-alerts'
import referralRouter     from './routes/referral'
import giftListsRouter    from './routes/gift-lists'
import deliveryRouter     from './routes/delivery'
import historyRouter       from './routes/history'
import sellerRouter        from './routes/seller'
import settingsRouter       from './routes/settings'
import dealAnnouncementsRouter from './routes/deal-announcements'
import productRequestsRouter   from './routes/product-requests'
import emailTemplatesRouter    from './routes/email-templates'
import returnsRouter           from './routes/returns'
import auditLogRouter          from './routes/audit-log'
import paymentsRouter          from './routes/payments'

const app = express()

/* ── CORS (must be before helmet) ──────────────────────────── */
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,   // cookies cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

/* ── Compression gzip — réduit la taille des réponses JSON ────── */
app.use(compression())

/* ── Sécurité ───────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
// Helmet ne définit pas Permissions-Policy par défaut — API pure, aucune
// des fonctionnalités concernées n'est utilisée.
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
  next()
})

/* ── Rate Limiting ──────────────────────────────────────────── */

// Global — toutes les routes (confortable en dev, suffisant en prod light)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 500,                   // augmenté : les SPA font beaucoup de requêtes légitimes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
  skip: (req) => req.method === 'GET', // les GET ne consomment pas le quota global
}))

// Auth actions sensibles uniquement (login / register / mot de passe / magic link)
// NE s'applique PAS à /me, /profile, /sessions (lectures normales)
const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // 20 tentatives par IP / 15 min — suffisant sans bloquer l'usage normal
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes' },
  keyGenerator: (req) => req.ip ?? 'unknown',
})

// Ralentissement progressif en complément du rate-limit dur ci-dessus — un
// bruteforce/credential-stuffing devient de plus en plus lent avant même
// d'atteindre la limite stricte, sans pénaliser un utilisateur normal qui
// se trompe une ou deux fois de mot de passe.
const authActionSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => (hits - 5) * 500, // +500ms par tentative au-delà de la 5e
  maxDelayMs: 5000,
  // Pas de keyGenerator custom : le défaut de express-slow-down (v3, basé sur
  // express-rate-limit v8) normalise déjà correctement les IPv6 — un
  // req.ip brut casserait cette protection (voir ERR_ERL_KEY_GEN_IPV6).
})

// Formulaires publics qui déclenchent un envoi d'email ou une écriture disque
// (contact, demande de sourcing, upload d'images) — cible anti-spam/anti-DoS,
// plus stricte que la limite globale généreuse ci-dessus.
const publicFormLimiter = rateLimit({
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
})

// Lecture du catalogue public (produits, catégories, blog) — le limiteur global
// exempte volontairement les GET (usage normal très fréquent), ce qui laissait
// la voie libre à l'aspiration automatisée du catalogue. Plafond généreux pour
// un visiteur normal, mais qui ralentit fortement un scraping en masse.
const publicDataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
  keyGenerator: (req) => req.ip ?? 'unknown',
  // les écritures admin (POST/PUT/PATCH/DELETE) restent protégées par requireAdmin uniquement
  skip: (req) => req.method !== 'GET' && req.method !== 'HEAD',
})

/* ── Parsers ────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* ── HPP — neutralise la pollution de paramètres HTTP (ex: ?role=customer&role=admin) ── */
app.use(hpp())

/* ── Logging ────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

/* ── Static (uploads) ───────────────────────────────────────── */
// Cache long + immutable : chaque upload (produit, catégorie, retour...) génère
// un nom de fichier aléatoire à chaque fois (prod-{ts}-{rand}.webp, cat-...) —
// une même URL ne sert donc jamais un contenu différent. Sans ça, chaque image
// était re-téléchargée à chaque visite, même chargée juste avant.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR), {
  maxAge: '1y',
  immutable: true,
}))

/* ── Health check ───────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status:  'OK',
    version: '1.0.0',
    ts:      new Date().toISOString(),
  })
})

/* ── Routes API ─────────────────────────────────────────────── */
// Limiteur strict sur les actions sensibles seulement (pas sur /me, /sessions, /profile)
app.use('/api/auth/login',          authActionSlowDown, authActionLimiter)
app.use('/api/auth/register',       authActionSlowDown, authActionLimiter)
app.use('/api/auth/forgot-password',authActionSlowDown, authActionLimiter)
app.use('/api/auth/reset-password', authActionSlowDown, authActionLimiter)
app.use('/api/auth/magic',          authActionSlowDown, authActionLimiter)
app.use('/api/auth/password',       authActionSlowDown, authActionLimiter)
app.use('/api/auth',                authRouter)
app.use('/api/products',      publicDataLimiter, productsRouter)
app.use('/api/orders',        ordersRouter)
app.use('/api/addresses',     addressesRouter)
app.use('/api/wishlist',      wishlistRouter)
app.use('/api/reviews',       reviewsRouter)
app.use('/api/contact',       publicFormLimiter, contactRouter)
app.use('/api/promo',         promoRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/blog',          publicDataLimiter, blogRouter)
app.use('/api/stores',        storesRouter)
app.use('/api/categories',   publicDataLimiter, categoriesRouter)
app.use('/api/tax',          taxRouter)
app.use('/api/newsletter',   newsletterRouter)
app.use('/api/loyalty',       loyaltyRouter)
app.use('/api/flash',         publicDataLimiter, flashRouter)
app.use('/api/stock-alerts',  stockAlertsRouter)
app.use('/api/referral',      referralRouter)
app.use('/api/gift-lists',    giftListsRouter)
app.use('/api/delivery',      deliveryRouter)
app.use('/api/history',        historyRouter)
app.use('/api/seller',         sellerRouter)
app.use('/api/settings',       settingsRouter)
app.use('/api/deal-announcements', dealAnnouncementsRouter)
app.use('/api/product-requests', publicFormLimiter, productRequestsRouter)
app.use('/api/email-templates', emailTemplatesRouter)
app.use('/api/returns',       returnsRouter)
app.use('/api/audit-log',     auditLogRouter)
app.use('/api/payments',      paymentsRouter)

/* ── 404 ────────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' })
})

/* ── Sentry + AppSignal — filets pour les erreurs qui remontent jusqu'à
   Express (la plupart des routes les attrapent déjà localement via
   logger.error, voir lib/logger.ts) — doivent être enregistrés après
   toutes les routes, avant le handler d'erreur générique ci-dessous. */
Sentry.setupExpressErrorHandler(app)
app.use(expressErrorHandler())

/* ── Error handler global ───────────────────────────────────── */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('[ERROR]', err)
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' })
})

export default app
