import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { cacheControl } from '../middleware/cache'

const router = Router()

/** Accepte "+225 07 00 00 00 00", "225-07-00-00-00-00", etc. → ne garde que les chiffres */
const zDigitsOnly = z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().min(8, 'Numéro invalide'))

/** Accepte "facebook.com/skignas" ou "https://facebook.com/skignas" */
const zLooseUrl = z.string().trim().transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.string().url('URL invalide').optional().or(z.literal('')))

const settingsSchema = z.object({
  supportPhone:   z.string().min(1),
  whatsappNumber: zDigitsOnly,
  supportEmail:   z.string().email(),
  contactEmail:   z.string().email(),
  address:        z.string().min(1),
  facebookUrl:    zLooseUrl,
  instagramUrl:   zLooseUrl,
  youtubeUrl:     zLooseUrl,
  tiktokUrl:      zLooseUrl,
})

/* ── GET /api/settings  — public (consommé par le site client) ── */
router.get('/', cacheControl(300), async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where:  { id: 1 },
      update: {},
      create: { id: 1 },
    })
    res.json({ success: true, data: { settings } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/settings  [ADMIN] ─────────────────────────────── */
router.put('/', requireAdmin, validate(settingsSchema.partial()), async (req, res) => {
  try {
    const data = req.body as Partial<z.infer<typeof settingsSchema>>
    const settings = await prisma.siteSettings.upsert({
      where:  { id: 1 },
      update: data,
      create: { id: 1, ...data },
    })
    res.json({ success: true, data: { settings } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
