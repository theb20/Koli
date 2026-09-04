import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword, signToken } from '../lib/auth.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Données invalides' })
  }
  const { email, password, firstName, lastName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email' })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
  })

  const token = signToken(user.id)
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.status(201).json({
    success: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  })
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' })
  }
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ success: false, message: 'Identifiants incorrects' })
  }

  const token = signToken(user.id)
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ success: true })
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })
  const companies = memberships.map((m) => ({ ...m.company, myRole: m.role }))
  res.json({ success: true, user, companies })
})
