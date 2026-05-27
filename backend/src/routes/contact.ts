import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendContactReply } from '../lib/mailer'

const router = Router()

const contactSchema = z.object({
  prenom:    z.string().min(2).max(50),
  nom:       z.string().min(2).max(50),
  email:     z.string().email(),
  telephone: z.string().optional(),
  sujet:     z.enum([
    'Commande', 'Livraison', 'Remboursement', 'Produit défectueux',
    'Question produit', 'Partenariat', 'Presse', 'Autre'
  ]),
  message: z.string().min(20, 'Message trop court').max(2000),
})

/* ── POST /api/contact ─────────────────────────────────────── */
router.post('/', validate(contactSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof contactSchema>

    await prisma.contactMessage.create({ data })

    // Email de confirmation automatique
    sendContactReply(data.email, data.prenom, data.sujet).catch(() => {})

    res.status(201).json({
      success: true,
      message: 'Message reçu ! Nous vous répondrons sous 24h.',
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/contact  [ADMIN] ─────────────────────────────── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const status = req.query['status'] as string | undefined
    const page   = parseInt(req.query['page'] as string) || 1
    const limit  = parseInt(req.query['limit'] as string) || 20

    const where = status ? { status } : {}
    const [total, messages] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
    ])

    res.json({ success: true, data: { messages, pagination: { page, limit, total } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/contact/:id/status  [ADMIN] ─────────────────── */
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = z.object({ status: z.enum(['new','read','replied']) }).parse(req.body)
    await prisma.contactMessage.update({ where: { id: req.params['id'] }, data: { status } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
