/* ─────────────────────────────────────────────────────────────
   Campagnes d'e-mail de sécurité [ADMIN] — /api/admin/security-emails.
   Un admin compose un message (objet + texte) et l'envoie soit à une
   liste précise d'utilisateurs (ciblé), soit à tous les utilisateurs
   actifs de la plateforme (en masse). L'envoi réel se fait toujours en
   tâche de fond (lib/securityEmailCampaign.ts) — cette route ne fait que
   créer la campagne et répondre immédiatement, jamais attendre l'envoi.

   Audience "all" = tous les utilisateurs non bannis, tous rôles confondus
   (admin/seller/customer) — mêmes critères que POST
   /api/notifications/broadcast pour la partie notification, mais ici SANS
   filtrer sur subscribedToNewsletter : une alerte de sécurité n'est pas
   une communication marketing, l'opt-in newsletter ne s'applique pas.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zCuidIdParam } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { runSecurityEmailCampaign } from '../lib/securityEmailCampaign'

const router = Router()
router.use(requireAdmin)

const createCampaignSchema = z.object({
  subject:  z.string().trim().min(3, 'Objet trop court').max(200),
  message:  z.string().trim().min(3, 'Message trop court').max(5000),
  audience: z.enum(['all', 'targeted']),
  userIds:  z.array(z.string()).max(10_000).optional(),
}).refine(d => d.audience === 'all' || (d.userIds && d.userIds.length > 0), {
  message: 'Sélectionnez au moins un utilisateur ciblé', path: ['userIds'],
})

/* ─────────────────────────────────────────────────────────────
   POST / — crée la campagne et démarre l'envoi en tâche de fond
───────────────────────────────────────────────────────────── */
router.post('/', validate(createCampaignSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof createCampaignSchema>

    let targetUserIds: string[] | null = null
    let totalRecipients: number

    if (body.audience === 'targeted') {
      const ids = [...new Set(body.userIds!)]
      const found = await prisma.user.count({ where: { id: { in: ids } } })
      if (found !== ids.length) {
        res.status(400).json({ success: false, message: 'Un ou plusieurs utilisateurs ciblés sont introuvables' })
        return
      }
      targetUserIds = ids
      totalRecipients = ids.length
    } else {
      totalRecipients = await prisma.user.count({ where: { isBanned: false } })
    }

    const campaign = await prisma.securityEmailCampaign.create({
      data: {
        subject:        body.subject,
        message:        body.message,
        audience:       body.audience,
        targetUserIds:  targetUserIds ? JSON.stringify(targetUserIds) : null,
        totalRecipients,
        createdById:    req.user!.userId,
      },
    })

    // Journalisé AVANT l'envoi (même si l'envoi échoue ensuite) — contrairement
    // à /api/notifications/broadcast qui n'a aucune trace, cette action le
    // touche potentiellement TOUS les utilisateurs et doit être traçable
    // quoi qu'il arrive.
    logAdminAction(req, {
      action: 'security_email.send', targetType: 'SecurityEmailCampaign', targetId: campaign.id,
      metadata: { audience: body.audience, totalRecipients, subject: body.subject },
    })

    runSecurityEmailCampaign(campaign.id).catch(err => logger.error('[admin-security-emails] campagne', campaign.id, err))

    res.status(201).json({ success: true, data: campaign })
  } catch (err) {
    logger.error('[admin-security-emails/create]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET / — historique des campagnes
───────────────────────────────────────────────────────────── */
router.get('/', async (_req, res) => {
  try {
    const campaigns = await prisma.securityEmailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { createdBy: { select: { prenom: true, nom: true, email: true } } },
    })
    res.json({ success: true, data: campaigns })
  } catch (err) {
    logger.error('[admin-security-emails/list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /:id — statut d'une campagne (poll pendant l'envoi)
───────────────────────────────────────────────────────────── */
router.get('/:id', validateParams(zCuidIdParam), async (req, res) => {
  try {
    const campaign = await prisma.securityEmailCampaign.findUnique({ where: { id: req.params['id']! } })
    if (!campaign) { res.status(404).json({ success: false, message: 'Campagne introuvable' }); return }
    res.json({ success: true, data: campaign })
  } catch (err) {
    logger.error('[admin-security-emails/get]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
