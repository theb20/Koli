import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { uploadToStockgo } from '../lib/stockgo'
import { scanBuffer } from '../lib/virusScan'
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

export default router
