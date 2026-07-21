import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { sendBroadcastEmail } from '../lib/mailer'
import { logger } from '../lib/logger'
import { validate, validateParams, validateQuery, zCuidIdParam, zPaginationQuery } from '../middleware/validate'

const router = Router()

const notifQuerySchema = zPaginationQuery.extend({ unread: z.string().max(10).optional() })

/* ── GET /api/notifications ─────────────────────────────────── */
router.get('/', requireAuth, validateQuery(notifQuerySchema), async (req, res) => {
  try {
    const { page, limit, unread } = req.query as unknown as z.infer<typeof notifQuerySchema>
    const unreadOnly = unread === 'true'

    const where = { userId: req.user!.userId, ...(unreadOnly ? { isRead: false } : {}) }

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ])

    res.json({ success: true, data: { notifications, unreadCount, pagination: { page, limit, total } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/notifications/:id/read ───────────────────────── */
router.put('/:id/read', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params['id'], userId: req.user!.userId },
      data:  { isRead: true },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/notifications/read-all ────────────────────────── */
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data:  { isRead: true },
    })
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/notifications/:id ─────────────────────────── */
router.delete('/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/notifications/admin/all  [ADMIN] ──────────────── */
router.get('/admin/all', requireAdmin, validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }

    const [total, notifications] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, prenom: true, nom: true, email: true } } },
      }),
    ])

    const unread = await prisma.notification.count({ where: { isRead: false } })
    res.json({ success: true, data: { notifications, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

/* ── DELETE /api/notifications/admin/clear  [ADMIN] ─────────── */
router.delete('/admin/clear', requireAdmin, async (_req, res) => {
  try {
    const { count } = await prisma.notification.deleteMany()
    res.json({ success: true, message: `${count} notifications supprimées` })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

const broadcastSchema = z.object({
  title:   z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  type:    z.enum(['info', 'order', 'return', 'promo']).default('info'),
})

/* ── POST /api/notifications/broadcast  [ADMIN] ─────────────── */
/* Notification in-app → tous les clients actifs (non bannis).
   Email → uniquement les clients ayant accepté la newsletter (consentement marketing). */
router.post('/broadcast', requireAdmin, validate(broadcastSchema), async (req, res) => {
  try {
    const { title, message, type } = req.body as z.infer<typeof broadcastSchema>
    const users = await prisma.user.findMany({
      where:  { isBanned: false },
      select: { id: true, prenom: true, email: true, subscribedToNewsletter: true },
    })
    if (users.length === 0) {
      res.json({ success: true, message: 'Aucun client actif.' })
      return
    }
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title, body: message, type })),
    })

    const emailRecipients = users.filter(u => u.subscribedToNewsletter)
    Promise.allSettled(
      emailRecipients.map(u => sendBroadcastEmail(u.email, u.prenom, title, message)),
    ).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) logger.error(`[broadcast email] ${failed}/${emailRecipients.length} envois échoués`)
    })

    res.json({
      success: true,
      message: `Notification envoyée à ${users.length} client(s) — email à ${emailRecipients.length} abonné(s) newsletter`,
    })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

export default router
