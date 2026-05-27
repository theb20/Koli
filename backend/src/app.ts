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

const app = express()

/* ── Sécurité ───────────────────────────────────────────────── */
app.use(helmet())
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,   // cookies cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

/* ── Rate Limiting ──────────────────────────────────────────── */
// Global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
}))

// Auth — plus strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion' },
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
app.use('/api/auth',          authLimiter, authRouter)
app.use('/api/products',      productsRouter)
app.use('/api/orders',        ordersRouter)
app.use('/api/addresses',     addressesRouter)
app.use('/api/wishlist',      wishlistRouter)
app.use('/api/reviews',       reviewsRouter)
app.use('/api/contact',       contactRouter)
app.use('/api/promo',         promoRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/blog',          blogRouter)

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
