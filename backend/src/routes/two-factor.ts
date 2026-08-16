import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import QRCode from 'qrcode'
import { generateSecret, generateURI, verifySync } from 'otplib'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { verifyTwoFactorPendingToken } from '../lib/jwt'
import { issueTokensAndSession } from '../lib/authSession'
import { sendTwoFactorEnabledEmail, sendTwoFactorDisabledEmail } from '../lib/mailer'
import { logger } from '../lib/logger'

const router = Router()

const RECOVERY_CODE_COUNT = 8

// Verrouillage de compte après échecs de code — protège contre le brute-force
// distribué (botnet), que le rate-limit par IP (authActionLimiter) ne couvre
// pas : un code à 6 chiffres n'a que 1M de combinaisons, largement atteignable
// en réparant les tentatives sur suffisamment d'IP différentes.
const MAX_TWOFACTOR_ATTEMPTS = 5
const TWOFACTOR_LOCKOUT_DURATION_MS = 15 * 60 * 1000

function generateRecoveryCodes(): string[] {
  // Format XXXX-XXXX, plus simple à recopier qu'un hex brut — 5 octets
  // aléatoires (40 bits) par code, largement suffisant pour un usage unique.
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
  })
}

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/2fa/setup — génère un secret TOTP en attente de
   confirmation (twoFactorEnabled reste false tant que /verify-setup
   n'a pas reçu un premier code valide).
───────────────────────────────────────────────────────────── */
router.post('/setup', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }
    if (user.twoFactorEnabled) {
      res.status(400).json({ success: false, message: 'La double authentification est déjà activée.' })
      return
    }
    if (!user.hasPassword) {
      res.status(400).json({ success: false, message: 'Définissez d\'abord un mot de passe — sinon vous ne pourrez plus désactiver la 2FA vous-même.' })
      return
    }

    const secret = generateSecret()
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } })

    const otpauth = generateURI({ secret, label: user.email, issuer: 'Skignas' })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

    res.json({ success: true, data: { secret, qrCodeDataUrl } })
  } catch (err) {
    logger.error('[2fa setup]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/2fa/verify-setup — confirme l'activation avec un
   premier code, génère et renvoie les codes de récupération (une seule
   fois — seul leur hash est conservé ensuite).
───────────────────────────────────────────────────────────── */
router.post('/verify-setup', requireAuth, async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().min(6).max(6) }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user?.twoFactorSecret) {
      res.status(400).json({ success: false, message: 'Aucune configuration 2FA en attente — relancez la mise en place.' })
      return
    }

    if (!verifySync({ token: code, secret: user.twoFactorSecret }).valid) {
      res.status(400).json({ success: false, message: 'Code invalide.' })
      return
    }

    const recoveryCodes = generateRecoveryCodes()
    const hashedCodes = await Promise.all(recoveryCodes.map(c => bcrypt.hash(c, 10)))

    await prisma.user.update({
      where: { id: user.id },
      data:  { twoFactorEnabled: true, twoFactorRecoveryCodes: JSON.stringify(hashedCodes) },
    })

    sendTwoFactorEnabledEmail(user.email, user.prenom).catch(err => logger.error('[2fa-enabled email]', err))

    res.json({ success: true, data: { recoveryCodes } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Code invalide' }); return }
    logger.error('[2fa verify-setup]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/2fa/disable — exige le mot de passe actuel, pas
   seulement une session active (empêche qu'une session volée désactive
   seule la protection qu'elle contourne déjà en partie).
───────────────────────────────────────────────────────────── */
router.post('/disable', requireAuth, async (req, res) => {
  try {
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) { res.status(400).json({ success: false, message: 'Mot de passe incorrect' }); return }

    await prisma.user.update({
      where: { id: user.id },
      data:  { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: null },
    })

    sendTwoFactorDisabledEmail(user.email, user.prenom).catch(err => logger.error('[2fa-disabled email]', err))

    res.json({ success: true, message: 'Double authentification désactivée.' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Requête invalide' }); return }
    logger.error('[2fa disable]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/2fa/login-verify — échange le tempToken émis par
   login/magic-link/google contre de vrais tokens, une fois le code TOTP
   (ou un code de récupération à usage unique) vérifié.
───────────────────────────────────────────────────────────── */
router.post('/login-verify', async (req, res) => {
  try {
    const { tempToken, code } = z.object({ tempToken: z.string().min(1), code: z.string().min(6) }).parse(req.body)

    let userId: string
    try {
      userId = verifyTwoFactorPendingToken(tempToken).userId
    } catch {
      res.status(401).json({ success: false, message: 'Session de connexion expirée — reconnectez-vous.' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(401).json({ success: false, message: 'Double authentification introuvable pour ce compte.' })
      return
    }

    // Verrouillage actif — refuse même un code correct tant que le délai n'est
    // pas écoulé (même logique que le verrouillage mot de passe côté /login).
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.twoFactorLockedUntil.getTime() - Date.now()) / 60_000)
      res.status(429).json({
        success: false,
        message: `Trop de tentatives — réessayez dans ${minutesLeft} min.`,
      })
      return
    }

    // verifySync exige un token de 6 chiffres — un code de récupération
    // (format XXXX-XXXX-XXXX) le ferait lever une TokenLengthError.
    const validTotp = /^\d{6}$/.test(code) && verifySync({ token: code, secret: user.twoFactorSecret }).valid

    if (!validTotp) {
      // Code de récupération : à usage unique, retiré de la liste dès
      // consommation (pas de re-hash global, juste filtrage du tableau).
      const hashedCodes: string[] = user.twoFactorRecoveryCodes ? JSON.parse(user.twoFactorRecoveryCodes) : []
      const normalized = code.trim().toUpperCase()
      let matchedIndex = -1
      for (let i = 0; i < hashedCodes.length; i++) {
        if (await bcrypt.compare(normalized, hashedCodes[i])) { matchedIndex = i; break }
      }
      if (matchedIndex === -1) {
        const attempts = user.twoFactorFailedAttempts + 1
        const lockedUntil = attempts >= MAX_TWOFACTOR_ATTEMPTS ? new Date(Date.now() + TWOFACTOR_LOCKOUT_DURATION_MS) : null
        await prisma.user.update({
          where: { id: user.id },
          data:  { twoFactorFailedAttempts: lockedUntil ? 0 : attempts, twoFactorLockedUntil: lockedUntil },
        })
        if (lockedUntil) {
          res.status(429).json({
            success: false,
            message: `Trop de tentatives échouées — réessayez dans ${TWOFACTOR_LOCKOUT_DURATION_MS / 60_000} min.`,
          })
          return
        }
        res.status(400).json({ success: false, message: 'Code invalide.' })
        return
      }
      hashedCodes.splice(matchedIndex, 1)
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorRecoveryCodes: JSON.stringify(hashedCodes) } })
    }

    if (user.twoFactorFailedAttempts > 0 || user.twoFactorLockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorFailedAttempts: 0, twoFactorLockedUntil: null } })
    }

    await issueTokensAndSession(user, req, res, { needsBirthdate: !user.naissance })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Requête invalide' }); return }
    logger.error('[2fa login-verify]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
