import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { uploadToStockgo } from '../lib/stockgo'
import { scanBuffer } from '../lib/virusScan'
import { sendVerificationCodeEmail } from '../lib/mailer'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

/*
 * Upload de fichiers pour le wizard d'inscription marchand (koli-business),
 * consommé par merchantgo/ (qui ne stocke que des URL, jamais de binaire).
 * Contrairement aux autres routes d'upload (categories, products...), pas
 * de conversion WebP ici : certains buckets acceptent des PDF (pièce
 * d'identité, justificatif de domicile), et une pièce d'identité ne doit
 * pas être ré-encodée — le fichier original est conservé tel quel.
 */

const router = Router()

/*
 * Whitelist stricte du bucket → visibilité. Un bucket hors de cette liste
 * est refusé : évite qu'un nom arbitraire ne finisse dans stockgo sans
 * contrôle de la sensibilité des données qu'il contient.
 */
const BUCKET_VISIBILITY: Record<string, 'public' | 'private'> = {
  'photo-profil':          'public',
  'logo-boutique':         'public',
  'banniere-boutique':     'public',
  'document-identite':     'private',
  'selfie':                'private',
  'justificatif-domicile': 'private',
}

const onboardingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo — plus généreux qu'une icône (photos/scans de documents)
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Seuls les fichiers image (jpg, png, webp, heic, avif) ou PDF sont acceptés'))
    }
  },
})

/** Cf. categories.ts — évite qu'une erreur multer ressorte en 500 générique */
function handleUpload(req: Request, res: Response, next: NextFunction) {
  onboardingUpload.single('file')(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Fichier trop volumineux (8 Mo maximum)' })
      return
    }
    const message = err instanceof Error ? err.message : 'Fichier invalide'
    res.status(400).json({ success: false, message })
  })
}

/* POST /api/merchant-onboarding/upload — authentifié, un fichier à la fois */
router.post('/upload', requireAuth, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Champ 'file' manquant" })
      return
    }

    const bucket = String(req.body.bucket ?? '')
    const visibility = BUCKET_VISIBILITY[bucket]
    if (!visibility) {
      res.status(400).json({ success: false, message: `Bucket invalide: ${bucket}` })
      return
    }

    const scan = await scanBuffer(req.file.buffer, req.file.originalname)
    if (!scan.clean) {
      logger.error('[merchant-onboarding] fichier rejeté (antivirus)', req.user!.userId, bucket, scan.reason)
      res.status(400).json({ success: false, message: 'Fichier rejeté par le scan antivirus' })
      return
    }

    const url = await uploadToStockgo(req.file.buffer, req.file.originalname, req.file.mimetype, bucket, visibility)
    res.status(201).json({ success: true, data: { url } })
  } catch (err) {
    logger.error('[merchant-onboarding] échec upload', err)
    res.status(500).json({ success: false, message: 'Échec de l\'upload' })
  }
})

/*
 * ── Vérification e-mail (étape 2 du wizard) ─────────────────────────
 * Se produit AVANT la création du compte (étape 3, une fois la date de
 * naissance connue) — donc non authentifié, juste email + code. Le
 * rate limit publicFormLimiter (app.ts) protège cette route au même titre
 * que les autres formulaires publics.
 */

const CODE_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/* POST /api/merchant-onboarding/email-verification/send */
router.post('/email-verification/send', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email.' })
      return
    }

    const code = crypto.randomInt(100000, 1000000).toString()
    await prisma.emailVerification.upsert({
      where:  { email: normalizedEmail },
      create: { email: normalizedEmail, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
      update: { codeHash: hashCode(code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    })

    await sendVerificationCodeEmail(normalizedEmail, code)
    res.json({ success: true, message: 'Code envoyé.' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Email invalide' }); return }
    logger.error('[merchant-onboarding] échec envoi code de vérification', err)
    res.status(500).json({ success: false, message: 'Échec de l\'envoi du code' })
  }
})

/* POST /api/merchant-onboarding/email-verification/confirm */
router.post('/email-verification/confirm', async (req, res) => {
  try {
    const { email, code } = z.object({
      email: z.string().email(),
      code:  z.string().length(6),
    }).parse(req.body)
    const normalizedEmail = email.toLowerCase().trim()

    const verification = await prisma.emailVerification.findUnique({ where: { email: normalizedEmail } })
    if (!verification) {
      res.status(400).json({ success: false, message: 'Aucun code envoyé pour cet email — redemandez-en un.' })
      return
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.delete({ where: { email: normalizedEmail } })
      res.status(400).json({ success: false, message: 'Code expiré — redemandez-en un.' })
      return
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await prisma.emailVerification.delete({ where: { email: normalizedEmail } })
      res.status(429).json({ success: false, message: 'Trop de tentatives — redemandez un nouveau code.' })
      return
    }

    const providedHash = Buffer.from(hashCode(code))
    const expectedHash  = Buffer.from(verification.codeHash)
    const valid = providedHash.length === expectedHash.length && crypto.timingSafeEqual(providedHash, expectedHash)

    if (!valid) {
      await prisma.emailVerification.update({ where: { email: normalizedEmail }, data: { attempts: { increment: 1 } } })
      res.status(400).json({ success: false, message: 'Code invalide.' })
      return
    }

    // À usage unique — supprimé après validation réussie
    await prisma.emailVerification.delete({ where: { email: normalizedEmail } })
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Requête invalide' }); return }
    logger.error('[merchant-onboarding] échec confirmation code de vérification', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
