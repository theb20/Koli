import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken, signMagicToken, verifyMagicToken } from '../lib/jwt'
import { validate, zPassword } from '../middleware/validate'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { sendWelcomeEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../lib/mailer'
import { ALLOWED_ORIGINS } from '../lib/allowedOrigins'
import { getAge, MIN_AGE } from '../lib/age'

const router = Router()

/* ── Schemas ─────────────────────────────────────────────────── */

const registerSchema = z.object({
  prenom:    z.string().min(1).max(50),
  nom:       z.string().min(1).max(50),
  email:     z.string().email('Email invalide'),
  password:  zPassword.optional(),   // optionnel — inscription sans mot de passe
  telephone: z.string().optional(),
  naissance: z.coerce.date({ required_error: 'Date de naissance requise', invalid_type_error: 'Date de naissance invalide' }),
}).refine(d => getAge(d.naissance) >= MIN_AGE, {
  message: `Vous devez avoir au moins ${MIN_AGE} ans pour créer un compte`,
  path: ['naissance'],
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Mot de passe requis'),
})

const updateProfileSchema = z.object({
  prenom:    z.string().min(2).max(50).optional(),
  nom:       z.string().min(2).max(50).optional(),
  telephone: z.string().optional(),
  genre:     z.enum(['Homme', 'Femme', 'Autre']).optional(),
  naissance: z.string().optional(),
  avatar:    z.string().optional(),   // URL ou base64
}).refine(d => !d.naissance || getAge(new Date(d.naissance)) >= MIN_AGE, {
  message: `Vous devez avoir au moins ${MIN_AGE} ans`,
  path: ['naissance'],
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     zPassword,
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'Token requis'),
  password: zPassword,
})

/* ── Helpers ─────────────────────────────────────────────────── */

function setAuthCookies(res: import('express').Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('access_token', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30j
  })
}

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/register
   • Avec password : inscription classique → connexion immédiate
   • Sans password : inscription sans mot de passe → magic link envoyé
───────────────────────────────────────────────────────────── */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { prenom, nom, email, telephone, naissance } = req.body as z.infer<typeof registerSchema>
    const rawPassword: string | undefined = req.body.password

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (exists) {
      res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email' })
      return
    }

    // Mot de passe : fourni ou aléatoire (inscription sans mot de passe)
    const passwordToHash = rawPassword ?? crypto.randomBytes(32).toString('hex')
    const hashed = await bcrypt.hash(passwordToHash, 12)

    const user = await prisma.user.create({
      data: { prenom, nom, email: email.toLowerCase().trim(), password: hashed, telephone, naissance },
    })

    /* ── Mode sans mot de passe : envoyer un magic link ── */
    if (!rawPassword) {
      const token = signMagicToken(user.id, user.email)
      const link  = `${process.env.FRONTEND_URL}/auth/magic?token=${token}&new=1`
      sendMagicLinkEmail(user.email, user.prenom, link).catch(err => console.error('[register magic-link]', err))

      res.status(201).json({
        success:     true,
        passwordless: true,
        message:     'Compte créé ! Vérifiez votre boîte mail pour vous connecter.',
      })
      return
    }

    /* ── Mode classique (avec mot de passe) : connexion immédiate ── */
    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    sendWelcomeEmail(email, prenom).catch(() => {})

    setAuthCookies(res, accessToken, refreshToken)
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: { id: user.id, prenom, nom, email: user.email, role: user.role },
        accessToken,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────────────────────────── */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
      return
    }

    // Ne bloque que si une date de naissance est connue et indique moins de 18 ans —
    // on ne peut pas vérifier l'âge des comptes créés avant que ce champ n'existe.
    if (user.naissance && getAge(user.naissance) < MIN_AGE) {
      res.status(403).json({ success: false, message: `L'accès est réservé aux personnes de ${MIN_AGE} ans et plus` })
      return
    }

    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    setAuthCookies(res, accessToken, refreshToken)
    res.json({
      success: true,
      data: {
        user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, avatar: user.avatar },
        accessToken,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/refresh
───────────────────────────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token ?? req.body?.refreshToken
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token manquant' })
      return
    }

    const payload = verifyRefreshToken(token)
    const session = await prisma.session.findUnique({ where: { refreshToken: token } })
    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Session expirée, reconnectez-vous' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      res.status(401).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }

    const newAccessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const newRefreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    })

    setAuthCookies(res, newAccessToken, newRefreshToken)
    res.json({ success: true, data: { accessToken: newAccessToken } })
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token invalide' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/logout
───────────────────────────────────────────────────────────── */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.cookies?.refresh_token
    if (token) {
      await prisma.session.deleteMany({ where: { refreshToken: token } })
    }
    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    res.json({ success: true, message: 'Déconnexion réussie' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/me
───────────────────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, prenom: true, nom: true, email: true,
        telephone: true, avatar: true, genre: true, naissance: true,
        role: true, isVerified: true, createdAt: true,
        subscribedToNewsletter: true,
        _count: { select: { orders: true, wishlist: true, reviews: true } },
      },
    })
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }
    res.json({ success: true, data: user })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/profile
───────────────────────────────────────────────────────────── */
router.put('/profile', requireAuth, validate(updateProfileSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof updateProfileSchema>
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...data,
        naissance: data.naissance ? new Date(data.naissance) : undefined,
      },
      select: { id: true, prenom: true, nom: true, email: true, telephone: true, avatar: true, genre: true, naissance: true },
    })
    res.json({ success: true, message: 'Profil mis à jour', data: updated })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/password
───────────────────────────────────────────────────────────── */
router.put('/password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' })
      return
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    // Révoque toutes les sessions sauf l'actuelle
    const currentRefresh = req.cookies?.refresh_token
    await prisma.session.deleteMany({
      where: { userId: user.id, NOT: { refreshToken: currentRefresh ?? '' } },
    })

    res.json({ success: true, message: 'Mot de passe modifié avec succès' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/forgot-password
   Réponse toujours générique — ne révèle jamais si l'email existe
   (protection contre l'énumération de comptes).
───────────────────────────────────────────────────────────── */
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body as z.infer<typeof forgotPasswordSchema>
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (user) {
      // Token opaque à usage unique — seul son hash SHA-256 est stocké en base,
      // pour qu'une fuite de la base ne permette pas de réutiliser le lien.
      const rawToken  = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash:       tokenHash,
          resetTokenExpiresAt:  new Date(Date.now() + 30 * 60 * 1000), // 30 min
        },
      })

      // L'Origin n'atteint cette route que si cors() l'a déjà validée contre
      // ALLOWED_ORIGINS — on ne construit donc jamais un lien vers un domaine
      // arbitraire fourni par le client.
      const origin = req.headers.origin && ALLOWED_ORIGINS.includes(req.headers.origin)
        ? req.headers.origin
        : (process.env.FRONTEND_URL ?? 'http://localhost:3000')
      const link = `${origin}/reinitialiser-mot-de-passe?token=${rawToken}`

      sendPasswordResetEmail(user.email, user.prenom, link).catch(err => console.error('[password-reset email]', err))
    }

    res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/reset-password
   Consomme le token à usage unique, change le mot de passe et
   révoque toutes les sessions existantes de l'utilisateur.
───────────────────────────────────────────────────────────── */
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body as z.infer<typeof resetPasswordSchema>
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findUnique({ where: { resetTokenHash: tokenHash } })
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Lien invalide ou expiré, demandez-en un nouveau.' })
      return
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, resetTokenHash: null, resetTokenExpiresAt: null },
      }),
      // Un mot de passe réinitialisé invalide toute session existante — potentiellement compromise.
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ])

    sendPasswordChangedEmail(user.email, user.prenom, req.ip).catch(err => console.error('[password-changed email]', err))

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès. Reconnectez-vous.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/auth/account — Suppression définitive du compte
───────────────────────────────────────────────────────────── */
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId
    // Cascade: sessions, addresses, orders FK handled by Prisma relations
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    res.json({ success: true, message: 'Compte supprimé définitivement' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/sessions
───────────────────────────────────────────────────────────── */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where:   { userId: req.user!.userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, userAgent: true, ipAddress: true, createdAt: true },
    })
    res.json({ success: true, data: sessions })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/auth/sessions/:id
───────────────────────────────────────────────────────────── */
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    await prisma.session.deleteMany({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    res.json({ success: true, message: 'Session révoquée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/google  — Connexion / inscription via Google
   Reçoit les infos Firebase, crée ou trouve le compte
───────────────────────────────────────────────────────────── */
router.post('/google', async (req, res) => {
  try {
    const schema = z.object({
      email:       z.string().email(),
      prenom:      z.string().min(1),
      nom:         z.string().min(1),
      avatar:      z.string().url().nullable().optional(),
      firebaseUid: z.string().min(1),
    })
    const body = schema.parse(req.body)
    const normalizedEmail = body.email.toLowerCase().trim()

    // Chercher un compte existant avec cet email
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      // Créer un nouveau compte (pas de mot de passe pour les comptes Google)
      user = await prisma.user.create({
        data: {
          email:      normalizedEmail,
          prenom:     body.prenom,
          nom:        body.nom,
          avatar:     body.avatar ?? null,
          password:   '',          // compte Google — pas de mot de passe local
          isVerified: true,        // email vérifié par Google
        },
      })
      // Email de bienvenue
      sendWelcomeEmail(user.email, user.prenom).catch(() => {})
    } else {
      // Ne bloque que si une date de naissance est connue et indique moins de 18 ans.
      if (user.naissance && getAge(user.naissance) < MIN_AGE) {
        res.status(403).json({ success: false, message: `L'accès est réservé aux personnes de ${MIN_AGE} ans et plus` })
        return
      }
      // Mettre à jour l'avatar si on en a un nouveau
      if (body.avatar && !user.avatar) {
        await prisma.user.update({ where: { id: user.id }, data: { avatar: body.avatar } })
        user = { ...user, avatar: body.avatar }
      }
    }

    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId:       user.id,
        refreshToken,
        userAgent:    req.headers['user-agent'],
        ipAddress:    req.ip,
        expiresAt:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    setAuthCookies(res, accessToken, refreshToken)
    res.json({
      success: true,
      data: {
        user: {
          id:     user.id,
          prenom: user.prenom,
          nom:    user.nom,
          email:  user.email,
          avatar: user.avatar,
          role:   user.role,
        },
        accessToken,
        // Google ne fournit pas la date de naissance — le front doit la demander
        // avant de laisser l'utilisateur accéder au reste du site.
        needsBirthdate: !user.naissance,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Données invalides', errors: err.flatten().fieldErrors })
      return
    }
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/users  [ADMIN] — Liste des utilisateurs
───────────────────────────────────────────────────────────── */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page    = parseInt(req.query['page'] as string) || 1
    const limit   = parseInt(req.query['limit'] as string) || 20
    const q       = req.query['q'] as string | undefined
    const role    = req.query['role'] as string | undefined
    const banned  = req.query['banned'] as string | undefined

    const where: Record<string, unknown> = {}
    if (role)   where['role']     = role
    if (banned === 'true')  where['isBanned'] = true
    if (banned === 'false') where['isBanned'] = false
    if (q) where['OR'] = [
      { prenom: { contains: q } },
      { nom:    { contains: q } },
      { email:  { contains: q } },
    ]

    const [total, users, totalAll, totalBanned, totalAdmins] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, prenom: true, nom: true, email: true,
          telephone: true, avatar: true, role: true, isBanned: true,
          isVerified: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        stats: { total: totalAll, banned: totalBanned, admins: totalAdmins },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/auth/users/:id/role  [ADMIN] ─────────────────── */
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id }   = req.params
    const { role } = req.body
    if (!['admin', 'customer'].includes(role)) {
      res.status(400).json({ success: false, message: 'Rôle invalide' })
      return
    }
    const user = await prisma.user.update({ where: { id }, data: { role } })
    res.json({ success: true, data: { user } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/auth/users/:id/ban  [ADMIN] ──────────────────── */
router.patch('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }
    const user = await prisma.user.update({ where: { id }, data: { isBanned: !existing.isBanned } })
    if (user.isBanned) {
      // Invalider toutes les sessions de cet utilisateur
      await prisma.session.deleteMany({ where: { userId: id } })
    }
    res.json({ success: true, data: { isBanned: user.isBanned } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/auth/users/:id  [ADMIN] ────────────────────────── */
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const schema = z.object({
      prenom:    z.string().min(1).optional(),
      nom:       z.string().min(1).optional(),
      email:     z.string().email().optional(),
      telephone: z.string().optional(),
      isVerified: z.boolean().optional(),
    })
    const data = schema.parse(req.body)
    const updateData: any = { ...data }
    if (data.email) {
      updateData.email = data.email.toLowerCase().trim()
    }
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, prenom: true, nom: true, email: true,
        telephone: true, role: true, isVerified: true, isBanned: true, createdAt: true,
      },
    })
    res.json({ success: true, data: user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Données invalides' })
      return
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/auth/users/:id  [ADMIN] ─────────────────────── */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    // Empêche de supprimer son propre compte
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' })
      return
    }
    await prisma.session.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })
    res.json({ success: true, message: 'Utilisateur supprimé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/magic-link  — envoie un lien de connexion par email
───────────────────────────────────────────────────────────── */
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Email requis' })
      return
    }
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (user) {
      const token = signMagicToken(user.id, user.email)
      const link  = `${process.env.FRONTEND_URL}/auth/magic?token=${token}`
      sendMagicLinkEmail(user.email, user.prenom, link).catch(err => console.error('[magic-link email]', err))
    }

    // Toujours renvoyer success (ne pas révéler si l'email existe)
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/magic-link/verify  — valide le token et connecte
───────────────────────────────────────────────────────────── */
router.post('/magic-link/verify', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) {
      res.status(400).json({ success: false, message: 'Token requis' })
      return
    }

    let payload: { userId: string; email: string; type: string }
    try {
      payload = verifyMagicToken(token)
    } catch {
      res.status(401).json({ success: false, message: 'Lien invalide ou expiré' })
      return
    }

    if (payload.type !== 'magic') {
      res.status(401).json({ success: false, message: 'Token invalide' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      res.status(401).json({ success: false, message: 'Compte introuvable' })
      return
    }

    if (user.naissance && getAge(user.naissance) < MIN_AGE) {
      res.status(403).json({ success: false, message: `L'accès est réservé aux personnes de ${MIN_AGE} ans et plus` })
      return
    }

    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId:    user.id,
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    setAuthCookies(res, accessToken, refreshToken)
    res.json({
      success: true,
      data: {
        user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, avatar: user.avatar },
        accessToken,
        needsBirthdate: !user.naissance,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/auth/users/:id  [ADMIN] ────────────────────────── */
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params['id'] },
      select: {
        id: true, prenom: true, nom: true, email: true,
        telephone: true, avatar: true, genre: true, naissance: true,
        role: true, isVerified: true, isBanned: true, createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, orderNumber: true, status: true, total: true,
            createdAt: true,
            items: { take: 1, select: { name: true, image: true } },
          },
        },
      },
    })
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }
    res.json({ success: true, data: user })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/auth/me  [AUTH] ───────────────────────────────── */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { prenom, nom, email } = req.body
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { prenom, nom, email },
      select: { id: true, prenom: true, nom: true, email: true, role: true, avatar: true },
    })
    res.json({ success: true, data: { user } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/auth/newsletter  [AUTH] ─────────────────────── */
/* Toggle l'abonnement newsletter de l'utilisateur connecté      */
router.patch('/newsletter', requireAuth, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { subscribedToNewsletter: true },
    })
    if (!current) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data:  { subscribedToNewsletter: !current.subscribedToNewsletter },
      select: { subscribedToNewsletter: true },
    })
    res.json({
      success: true,
      data: { subscribedToNewsletter: updated.subscribedToNewsletter },
      message: updated.subscribedToNewsletter
        ? 'Vous êtes maintenant abonné(e) à la newsletter.'
        : 'Vous vous êtes désabonné(e) de la newsletter.',
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
