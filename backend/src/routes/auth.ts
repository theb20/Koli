import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken, isTokenExpiredError, unsafeDecodeExpiredRefreshToken } from '../lib/jwt'
import { safeUserAgent, setAuthCookies, clearAuthCookies, completeAuthentication } from '../lib/authSession'
import { validate, validateParams, validateQuery, zPassword, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { sendWelcomeEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendPasswordChangedEmail, sendBroadcastEmail } from '../lib/mailer'
import { ALLOWED_ORIGINS } from '../lib/allowedOrigins'
import { getAge, MIN_AGE } from '../lib/age'
import { verifyRecaptcha } from '../lib/recaptcha'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'
import { findReferrer, awardReferralBonus } from './referral'

const router = Router()

// Verrouillage de compte — au-delà de MAX_LOGIN_ATTEMPTS mots de passe
// erronés consécutifs (tous panneaux de connexion confondus : koili,
// koli-admin, koli-marchand — tous appellent ce même endpoint), le compte
// est bloqué LOCKOUT_DURATION_MS avant toute nouvelle tentative, y compris
// avec le bon mot de passe.
const MAX_LOGIN_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/* ── Schemas ─────────────────────────────────────────────────── */

const registerSchema = z.object({
  prenom:    z.string().min(1).max(50),
  nom:       z.string().min(1).max(50),
  email:     z.string().email('Email invalide'),
  password:  zPassword.optional(),   // optionnel — inscription sans mot de passe
  telephone: z.string().optional(),
  naissance: z.coerce.date({ required_error: 'Date de naissance requise', invalid_type_error: 'Date de naissance invalide' }),
  referralCode: z.string().trim().max(50).optional(),
  recaptchaToken: z.string().optional(),
}).refine(d => getAge(d.naissance) >= MIN_AGE, {
  message: `Vous devez avoir au moins ${MIN_AGE} ans pour créer un compte`,
  path: ['naissance'],
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Mot de passe requis'),
  recaptchaToken: z.string().optional(),
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

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/register
   • Avec password : inscription classique → connexion immédiate
   • Sans password : inscription sans mot de passe → magic link envoyé
───────────────────────────────────────────────────────────── */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { prenom, nom, email, telephone, naissance, referralCode, recaptchaToken } = req.body as z.infer<typeof registerSchema>
    const rawPassword: string | undefined = req.body.password

    if (!(await verifyRecaptcha(recaptchaToken, 'register'))) {
      res.status(403).json({ success: false, message: 'Vérification anti-robot échouée, veuillez réessayer' })
      return
    }

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (exists) {
      res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email' })
      return
    }

    const referrer = await findReferrer(referralCode)

    // Mot de passe : fourni (inscription classique) ou absent (inscription
    // sans mot de passe, ex. koili) — dans ce cas `password` reste vide,
    // comme pour un compte Google, et hasPassword=false le signale au front.
    const password = rawPassword ? await bcrypt.hash(rawPassword, 12) : ''

    const user = await prisma.user.create({
      data: { prenom, nom, email: email.toLowerCase().trim(), password, hasPassword: !!rawPassword, telephone, naissance, referredById: referrer?.id },
    })

    /* ── Mode sans mot de passe : envoyer un magic link ── */
    if (!rawPassword) {
      // Le bonus de parrainage n'est PAS crédité ici : à ce stade, personne n'a encore
      // prouvé posséder cette adresse email (le lien n'a même pas été cliqué). Le
      // créditer maintenant permettrait de générer des points à volonté avec des emails
      // jetables jamais consultés. Il est crédité dans /magic-link/verify, au premier
      // login réel — seul moment où la possession de l'email est vérifiée.
      // Token opaque à usage unique — même motif que resetTokenHash : seul son
      // hash SHA-256 est stocké, pour qu'une fuite de la base ne permette pas
      // de rejouer le lien.
      const rawMagicToken  = crypto.randomBytes(32).toString('hex')
      const magicTokenHash = crypto.createHash('sha256').update(rawMagicToken).digest('hex')
      await prisma.user.update({
        where: { id: user.id },
        data:  { magicTokenHash, magicTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      })
      const link = `${process.env.FRONTEND_URL}/auth/magic?token=${rawMagicToken}&new=1`
      sendMagicLinkEmail(user.email, user.prenom, link).catch(err => logger.error('[register magic-link]', err))

      res.status(201).json({
        success:     true,
        passwordless: true,
        message:     'Compte créé ! Vérifiez votre boîte mail pour vous connecter.',
      })
      return
    }

    // Mode classique : contrairement au flux magic-link, aucune étape ne prouve ici
    // la possession de l'email (pas de vérification par email pour les comptes avec
    // mot de passe dans ce backend) — le bonus de parrainage n'est donc pas crédité
    // dans cette branche, pour ne pas rouvrir la même faille de farming par email
    // jetable. referredById reste posé sur le compte si un jour une vérification y
    // est ajoutée.

    /* ── Mode classique (avec mot de passe) : connexion immédiate ── */
    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: safeUserAgent(req),
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
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────────────────────────── */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body as z.infer<typeof loginSchema>
    const normalizedEmail = email.toLowerCase().trim()

    if (!(await verifyRecaptcha(recaptchaToken, 'login'))) {
      res.status(403).json({ success: false, message: 'Vérification anti-robot échouée, veuillez réessayer' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
      return
    }

    // Verrouillage actif — refuse même un mot de passe correct tant que le
    // délai n'est pas écoulé, pour ne pas laisser une tentative tardive
    // réussie contourner le verrouillage.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
      res.status(429).json({
        success: false,
        message: `Compte temporairement bloqué après plusieurs échecs — réessayez dans ${minutesLeft} min.`,
      })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1
      const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
      await prisma.user.update({
        where: { id: user.id },
        data:  { failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil },
      })

      if (lockedUntil) {
        res.status(429).json({
          success: false,
          message: `Trop de tentatives échouées — compte bloqué ${LOCKOUT_DURATION_MS / 60_000} min.`,
        })
        return
      }
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
      return
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })
    }

    // Ne bloque que si une date de naissance est connue et indique moins de 18 ans —
    // on ne peut pas vérifier l'âge des comptes créés avant que ce champ n'existe.
    if (user.naissance && getAge(user.naissance) < MIN_AGE) {
      res.status(403).json({ success: false, message: `L'accès est réservé aux personnes de ${MIN_AGE} ans et plus` })
      return
    }

    await completeAuthentication(user, req, res)
  } catch (err) {
    logger.error(err)
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

    let payload: Pick<import('../lib/jwt').JwtPayload, 'userId'>
    try {
      payload = verifyRefreshToken(token)
    } catch (err) {
      // Signature authentique mais expirée : jsonwebtoken valide toujours la
      // signature avant de vérifier `exp`, donc le contenu reste fiable ici.
      // Un refresh token expiré révoque TOUTES les sessions de l'utilisateur,
      // pas seulement celle-ci — force une reconnexion complète sur tous les
      // appareils plutôt que de laisser d'anciennes sessions traîner.
      if (isTokenExpiredError(err)) {
        const userId = unsafeDecodeExpiredRefreshToken(token)
        if (userId) await prisma.session.deleteMany({ where: { userId } })
      }
      res.status(401).json({ success: false, message: 'Session expirée, reconnectez-vous' })
      return
    }

    const session = await prisma.session.findUnique({ where: { refreshToken: token } })
    if (!session || session.expiresAt < new Date()) {
      // Signature valide mais aucune session correspondante (déjà tournée,
      // déjà révoquée ailleurs...) — signal possible de réutilisation d'un
      // ancien refresh token : on révoque tout par précaution plutôt que de
      // se contenter d'un 401 silencieux.
      await prisma.session.deleteMany({ where: { userId: payload.userId } })
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
    clearAuthCookies(res)
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
        subscribedToNewsletter: true, twoFactorEnabled: true,
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
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, passwordChangedAt: new Date() } })

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

      sendPasswordResetEmail(user.email, user.prenom, link).catch(err => logger.error('[password-reset email]', err))
    }

    res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/password/request-set — variante authentifiée de
   forgot-password, pour les comptes sans mot de passe (magic-link/Google,
   hasPassword=false) qui veulent en définir un depuis TabSecurite. Même
   mécanisme de token que reset-password, qui reste la route qui finalise.
───────────────────────────────────────────────────────────── */
router.post('/password/request-set', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }

    const rawToken  = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    })

    const origin = req.headers.origin && ALLOWED_ORIGINS.includes(req.headers.origin)
      ? req.headers.origin
      : (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    const link = `${origin}/reinitialiser-mot-de-passe?token=${rawToken}`

    sendPasswordResetEmail(user.email, user.prenom, link).catch(err => logger.error('[password-reset email]', err))

    res.json({ success: true, message: 'Un lien pour définir votre mot de passe vient de vous être envoyé par email.' })
  } catch (err) {
    logger.error('[password request-set]', err)
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
        data: { password: hashed, hasPassword: true, resetTokenHash: null, resetTokenExpiresAt: null, passwordChangedAt: new Date() },
      }),
      // Un mot de passe réinitialisé invalide toute session existante — potentiellement compromise.
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ])

    sendPasswordChangedEmail(user.email, user.prenom, req.ip).catch(err => logger.error('[password-changed email]', err))

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès. Reconnectez-vous.' })
  } catch (err) {
    logger.error(err)
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
    clearAuthCookies(res)
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

/*
 * ── GET /api/auth/security-score ────────────────────────────────────
 * Remplace le score "72%" figé côté front — recalculé à chaque appel à
 * partir de critères réellement vérifiables (rien lié à la détection
 * VPN/Proxy/Tor, volontairement hors périmètre pour l'instant).
 */
const SECURITY_CHECKLIST_WEIGHTS = {
  email_verified:  20,
  two_factor:      35,
  password_recent: 20,
  no_lockout:      15,
  sessions_sane:   10,
} as const

router.get('/security-score', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }

    const sessionCount = await prisma.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } })

    // Compte récent (< 30j) sans mot de passe encore changé : on ne pénalise
    // pas un mot de passe "jamais changé" alors qu'il vient d'être choisi.
    const passwordRecent = user.passwordChangedAt
      ? user.passwordChangedAt > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      : user.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const checklist = [
      { key: 'email_verified',  label: 'E-mail vérifié',                                done: user.isVerified },
      { key: 'two_factor',      label: 'Authentification à deux facteurs (2FA)',        done: user.twoFactorEnabled },
      { key: 'password_recent', label: 'Mot de passe changé au cours des 6 derniers mois', done: passwordRecent },
      { key: 'no_lockout',      label: 'Aucune tentative de connexion échouée en cours', done: user.failedLoginAttempts === 0 },
      { key: 'sessions_sane',   label: 'Nombre de sessions actives sous contrôle',        done: sessionCount > 0 && sessionCount <= 5 },
    ] as const

    const score = checklist.reduce((s, c) => s + (c.done ? SECURITY_CHECKLIST_WEIGHTS[c.key as keyof typeof SECURITY_CHECKLIST_WEIGHTS] : 0), 0)

    res.json({ success: true, data: { score, checklist, hasPassword: user.hasPassword } })
  } catch (err) {
    logger.error('[security-score]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/auth/sessions/:id
───────────────────────────────────────────────────────────── */
router.delete('/sessions/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
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
      referralCode: z.string().trim().max(50).optional(),
    })
    const body = schema.parse(req.body)
    const normalizedEmail = body.email.toLowerCase().trim()

    // Chercher un compte existant avec cet email
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      // Créer un nouveau compte (pas de mot de passe pour les comptes Google)
      const referrer = await findReferrer(body.referralCode)
      user = await prisma.user.create({
        data: {
          email:      normalizedEmail,
          prenom:     body.prenom,
          nom:        body.nom,
          avatar:     body.avatar ?? null,
          password:    '',         // compte Google — pas de mot de passe local
          hasPassword: false,
          isVerified: true,        // email vérifié par Google
          referredById: referrer?.id,
        },
      })
      if (referrer) await awardReferralBonus(referrer.id, `${body.prenom} ${body.nom}`)
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

    await completeAuthentication(user, req, res, {
      // Google ne fournit pas la date de naissance — le front doit la demander
      // avant de laisser l'utilisateur accéder au reste du site.
      needsBirthdate: !user.naissance,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Données invalides', errors: err.flatten().fieldErrors })
      return
    }
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/users  [ADMIN] — Liste des utilisateurs
───────────────────────────────────────────────────────────── */
const usersQuerySchema = zPaginationQuery.extend({
  q:      z.string().max(200).optional(),
  role:   z.string().max(50).optional(),
  banned: z.string().max(10).optional(),
})

router.get('/users', requireAdmin, validateQuery(usersQuerySchema), async (req, res) => {
  try {
    const { page, limit, q, role, banned } = req.query as unknown as z.infer<typeof usersQuerySchema>

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
router.patch('/users/:id/role', requireAdmin, validateParams(zCuidIdParam), validate(z.object({ role: z.enum(['admin', 'customer']) })), async (req, res) => {
  try {
    const { id }   = req.params
    const { role } = req.body as { role: 'admin' | 'customer' }
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, prenom: true, nom: true, email: true, role: true },
    })
    logAdminAction(req, { action: 'user.role.update', targetType: 'User', targetId: id!, metadata: { newRole: role } })
    res.json({ success: true, data: { user } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/auth/users/:id/ban  [ADMIN] ──────────────────── */
router.patch('/users/:id/ban', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
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
    logAdminAction(req, { action: user.isBanned ? 'user.ban' : 'user.unban', targetType: 'User', targetId: id! })
    res.json({ success: true, data: { isBanned: user.isBanned } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/auth/users/:id  [ADMIN] ────────────────────────── */
router.put('/users/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
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
router.delete('/users/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const { id } = req.params
    // Empêche de supprimer son propre compte
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' })
      return
    }
    await prisma.session.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })
    logAdminAction(req, { action: 'user.delete', targetType: 'User', targetId: id! })
    res.json({ success: true, message: 'Utilisateur supprimé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/magic-link  — envoie un lien de connexion par email
───────────────────────────────────────────────────────────── */
const magicLinkSchema = z.object({ email: z.string().email('Email invalide') })

router.post('/magic-link', validate(magicLinkSchema), async (req, res) => {
  try {
    const { email } = req.body as z.infer<typeof magicLinkSchema>
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (user) {
      const rawMagicToken  = crypto.randomBytes(32).toString('hex')
      const magicTokenHash = crypto.createHash('sha256').update(rawMagicToken).digest('hex')
      await prisma.user.update({
        where: { id: user.id },
        data:  { magicTokenHash, magicTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      })
      const link = `${process.env.FRONTEND_URL}/auth/magic?token=${rawMagicToken}`
      sendMagicLinkEmail(user.email, user.prenom, link).catch(err => logger.error('[magic-link email]', err))
    }

    // Toujours renvoyer success (ne pas révéler si l'email existe)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/magic-link/verify  — valide le token et connecte
───────────────────────────────────────────────────────────── */
const magicLinkVerifySchema = z.object({ token: z.string().min(1, 'Token requis') })

router.post('/magic-link/verify', validate(magicLinkVerifySchema), async (req, res) => {
  try {
    const { token } = req.body as z.infer<typeof magicLinkVerifySchema>
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const candidate = await prisma.user.findUnique({ where: { magicTokenHash: tokenHash } })
    if (!candidate || !candidate.magicTokenExpiresAt || candidate.magicTokenExpiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Lien invalide, expiré ou déjà utilisé.' })
      return
    }

    // Consommation atomique à usage unique — la même requête vérifie ET invalide
    // le lien, pour qu'un rejeu (double-clic, onglet dupliqué, scanner de sécurité
    // qui pré-visite le lien, email transféré) échoue au deuxième essai. Le garde-fou
    // "magicTokenHash: tokenHash" au moment de l'update gère aussi la course entre
    // deux requêtes concurrentes avec le même token : une seule verra count > 0.
    const consumed = await prisma.user.updateMany({
      where: { id: candidate.id, magicTokenHash: tokenHash },
      data:  { magicTokenHash: null, magicTokenExpiresAt: null },
    })
    if (consumed.count === 0) {
      res.status(401).json({ success: false, message: 'Lien invalide, expiré ou déjà utilisé.' })
      return
    }

    const user = candidate

    if (user.naissance && getAge(user.naissance) < MIN_AGE) {
      res.status(403).json({ success: false, message: `L'accès est réservé aux personnes de ${MIN_AGE} ans et plus` })
      return
    }

    // Premier login réel de ce compte ? (avant de créer la session ci-dessous) —
    // seul moment où la possession de l'email est prouvée : c'est ici, et
    // seulement ici, que le bonus de parrainage éventuel est crédité.
    const isFirstLogin = (await prisma.session.count({ where: { userId: user.id } })) === 0

    if (isFirstLogin && user.referredById) {
      await awardReferralBonus(user.referredById, `${user.prenom} ${user.nom}`)
    }

    await completeAuthentication(user, req, res, { needsBirthdate: !user.naissance })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/auth/users/:id  [ADMIN] ────────────────────────── */
router.get('/users/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
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

const userEmailSchema = z.object({
  subject: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
})

/* ── POST /api/auth/users/:id/email  [ADMIN] — message direct à un client ── */
router.post('/users/:id/email', requireAdmin, validateParams(zCuidIdParam), validate(userEmailSchema), async (req, res) => {
  try {
    const { subject, message } = req.body as z.infer<typeof userEmailSchema>
    const user = await prisma.user.findUnique({
      where: { id: req.params['id'] },
      select: { email: true, prenom: true },
    })
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
      return
    }

    await sendBroadcastEmail(user.email, user.prenom, subject, message)
    logAdminAction(req, { action: 'user.email', targetType: 'User', targetId: req.params['id']!, metadata: { subject } })

    res.json({ success: true, message: `Email envoyé à ${user.email}` })
  } catch (err) {
    logger.error('[auth] échec envoi email direct', err)
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email" })
  }
})

const updateMeSchema = z.object({
  prenom: z.string().min(1).max(50),
  nom:    z.string().min(1).max(50),
  email:  z.string().email('Email invalide'),
})

/* ── PUT /api/auth/me  [AUTH] ───────────────────────────────── */
router.put('/me', requireAuth, validate(updateMeSchema), async (req, res) => {
  try {
    const { prenom, nom, email } = req.body as z.infer<typeof updateMeSchema>
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
