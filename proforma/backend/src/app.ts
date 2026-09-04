import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'node:path'

import { authRouter } from './routes/auth.routes.js'
import { companiesRouter } from './routes/companies.routes.js'
import { clientsRouter } from './routes/clients.routes.js'
import { productsRouter } from './routes/products.routes.js'
import { taxesRouter } from './routes/taxes.routes.js'
import { proformasRouter } from './routes/proformas.routes.js'
import { invoicesRouter } from './routes/invoices.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { publicRouter } from './routes/public.routes.js'
import { notificationsRouter } from './routes/notifications.routes.js'
import { exportRouter } from './routes/export.routes.js'
import { templatesRouter } from './routes/templates.routes.js'
import { recurringRouter } from './routes/recurring.routes.js'

export const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: (process.env.APP_PUBLIC_URL || 'http://localhost:5175').split(','),
    credentials: true,
  })
)
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(morgan('dev'))

app.use('/uploads', express.static(path.resolve('uploads')))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.get('/health', (_req, res) => res.json({ ok: true }))

// IMPORTANT : les routeurs ci-dessous montés sur le préfixe générique '/api'
// (clientsRouter, productsRouter, ...) posent chacun un requireAuth au
// niveau du routeur entier (router.use(requireAuth)) — Express l'exécute
// pour TOUTE requête dont le chemin commence par '/api', qu'une route
// interne corresponde ensuite ou non. Les routes qui doivent rester
// accessibles sans authentification (auth, public, uploads déjà servis plus
// haut) doivent donc impérativement être montées AVANT ces routeurs
// génériques, sinon elles sont interceptées par un requireAuth qui ne les
// concerne pas et renvoient 401 avant même d'être évaluées.
app.use('/api/auth', authRouter)
app.use('/api/public', publicRouter)
app.use('/api/companies', companiesRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api', clientsRouter)
app.use('/api', productsRouter)
app.use('/api', taxesRouter)
app.use('/api', proformasRouter)
app.use('/api', invoicesRouter)
app.use('/api', dashboardRouter)
app.use('/api', templatesRouter)
app.use('/api', recurringRouter)
app.use('/api', exportRouter)

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Erreur serveur' })
})
