import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import path from 'path'

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

const app = express()

/* ── CORS (must be before helmet) ──────────────────────────── */
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL ?? 
  'http://localhost:3000',
  'http://localhost:5174',
  'http://192.168.1.29:3001',
  'http://192.168.1.29:5174',
  'https://skignas.ahobaut.fr',
]

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

/* ── Sécurité ───────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

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

/* ── Parsers ────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* ── Logging ────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

/* ── Static (uploads) ───────────────────────────────────────── */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)))

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
app.use('/api/auth/login',          authActionLimiter)
app.use('/api/auth/register',       authActionLimiter)
app.use('/api/auth/forgot-password',authActionLimiter)
app.use('/api/auth/magic',          authActionLimiter)
app.use('/api/auth/password',       authActionLimiter)
app.use('/api/auth',                authRouter)
app.use('/api/products',      productsRouter)
app.use('/api/orders',        ordersRouter)
app.use('/api/addresses',     addressesRouter)
app.use('/api/wishlist',      wishlistRouter)
app.use('/api/reviews',       reviewsRouter)
app.use('/api/contact',       contactRouter)
app.use('/api/promo',         promoRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/blog',          blogRouter)
app.use('/api/stores',        storesRouter)
app.use('/api/categories',   categoriesRouter)
app.use('/api/tax',          taxRouter)
app.use('/api/newsletter',   newsletterRouter)
app.use('/api/loyalty',       loyaltyRouter)
app.use('/api/flash',         flashRouter)
app.use('/api/stock-alerts',  stockAlertsRouter)
app.use('/api/referral',      referralRouter)
app.use('/api/gift-lists',    giftListsRouter)
app.use('/api/delivery',      deliveryRouter)
app.use('/api/history',        historyRouter)
app.use('/api/seller',         sellerRouter)
app.use('/api/settings',       settingsRouter)
app.use('/api/deal-announcements', dealAnnouncementsRouter)

/* ── 404 ────────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' })
})

/* ── Error handler global ───────────────────────────────────── */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' })
})

export default app
