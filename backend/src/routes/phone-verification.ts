/* ─────────────────────────────────────────────────────────────
   Vérification du numéro de téléphone par SMS (Zavu) — non bloquante :
   un compte fonctionne normalement avec phoneVerified=false, exactement
   comme isVerified (email) aujourd'hui. Déclenchée depuis le profil,
   jamais à l'inscription elle-même.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { isZavuConfigured, sendSms } from '../lib/sms/zavu'
import { normalizePhoneCI, generateOtpCode } from '../lib/phone'
import { logger } from '../lib/logger'

const router = Router()

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/phone/send-code — envoie (ou renvoie) le code au
   numéro actuellement enregistré sur le compte (User.telephone).
───────────────────────────────────────────────────────────── */
router.post('/send-code', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }
    if (!user.telephone) {
      res.status(400).json({ success: false, message: 'Ajoutez un numéro de téléphone à votre profil avant de le vérifier.' })
      return
    }
    if (user.phoneVerified) {
      res.status(400).json({ success: false, message: 'Ce numéro est déjà vérifié.' })
      return
    }
    if (!isZavuConfigured()) {
      res.status(503).json({ success: false, message: 'Vérification par SMS indisponible pour le moment.' })
      return
    }
    if (user.phoneVerificationSentAt && Date.now() - user.phoneVerificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - user.phoneVerificationSentAt.getTime())) / 1000)
      res.status(429).json({ success: false, message: `Merci de patienter ${wait}s avant de redemander un code.` })
      return
    }

    const code = generateOtpCode()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationCodeHash:   hashCode(code),
        phoneVerificationExpiresAt:  new Date(Date.now() + CODE_TTL_MS),
        phoneVerificationSentAt:     new Date(),
        phoneVerificationAttempts:   0,
        phoneVerificationLockedUntil: null,
      },
    })

    await sendSms(normalizePhoneCI(user.telephone), `Skignas : votre code de vérification est ${code}. Il expire dans 10 minutes.`)

    res.json({ success: true, message: 'Code envoyé par SMS.' })
  } catch (err) {
    logger.error('[phone send-code]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/phone/verify-code
───────────────────────────────────────────────────────────── */
router.post('/verify-code', requireAuth, async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().min(6).max(6) }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ success: false, message: 'Utilisateur introuvable' }); return }
    if (user.phoneVerified) {
      res.status(400).json({ success: false, message: 'Ce numéro est déjà vérifié.' })
      return
    }
    if (!user.phoneVerificationCodeHash || !user.phoneVerificationExpiresAt) {
      res.status(400).json({ success: false, message: 'Aucun code en attente — demandez-en un nouveau.' })
      return
    }
    if (user.phoneVerificationLockedUntil && user.phoneVerificationLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.phoneVerificationLockedUntil.getTime() - Date.now()) / 60_000)
      res.status(429).json({ success: false, message: `Trop de tentatives — réessayez dans ${minutesLeft} min.` })
      return
    }
    if (user.phoneVerificationExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Code expiré — demandez-en un nouveau.' })
      return
    }

    if (hashCode(code) !== user.phoneVerificationCodeHash) {
      const attempts = user.phoneVerificationAttempts + 1
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
      await prisma.user.update({
        where: { id: user.id },
        data:  { phoneVerificationAttempts: lockedUntil ? 0 : attempts, phoneVerificationLockedUntil: lockedUntil },
      })
      if (lockedUntil) {
        res.status(429).json({ success: false, message: `Trop de tentatives échouées — réessayez dans ${LOCKOUT_DURATION_MS / 60_000} min.` })
        return
      }
      res.status(400).json({ success: false, message: 'Code invalide.' })
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerificationCodeHash: null,
        phoneVerificationExpiresAt: null,
        phoneVerificationAttempts: 0,
        phoneVerificationLockedUntil: null,
      },
    })

    res.json({ success: true, message: 'Numéro vérifié avec succès.' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Code invalide' }); return }
    logger.error('[phone verify-code]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
