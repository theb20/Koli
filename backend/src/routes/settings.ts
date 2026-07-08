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

/** Liste d'emails séparés par des virgules — chacun validé, vides ignorés */
const zEmailList = z.string().transform(v =>
  v.split(',').map(e => e.trim()).filter(Boolean).join(', ')
).refine(v => v.split(',').map(e => e.trim()).filter(Boolean).every(e => z.string().email().safeParse(e).success), {
  message: 'Un ou plusieurs emails sont invalides',
})

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
  orderNotifyEmails: zEmailList,
})

/** Champs sûrs à exposer publiquement — orderNotifyEmails est un détail interne, jamais renvoyé ici */
const PUBLIC_FIELDS = [
  'id', 'supportPhone', 'whatsappNumber', 'supportEmail', 'contactEmail',
  'address', 'facebookUrl', 'instagramUrl', 'youtubeUrl', 'tiktokUrl', 'updatedAt',
] as const

/* ── GET /api/settings  — public (consommé par le site client) ── */
router.get('/', cacheControl(300), async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where:  { id: 1 },
      update: {},
      create: { id: 1 },
      select: Object.fromEntries(PUBLIC_FIELDS.map(f => [f, true])),
    })
    res.json({ success: true, data: { settings } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/settings/admin  [ADMIN] — vue complète, avec les champs internes ── */
router.get('/admin', requireAdmin, async (_req, res) => {
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
