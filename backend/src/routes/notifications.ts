import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

/* ── GET /api/notifications ─────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query['page'] as string) || 1
    const limit = parseInt(req.query['limit'] as string) || 20
    const unreadOnly = req.query['unread'] === 'true'

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
router.put('/:id/read', requireAuth, async (req, res) => {
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
router.delete('/:id', requireAuth, async (req, res) => {
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
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page  = parseInt(req.query['page'] as string) || 1
    const limit = parseInt(req.query['limit'] as string) || 30

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

/* ── POST /api/notifications/broadcast  [ADMIN] ─────────────── */
/* Envoie uniquement aux utilisateurs abonnés à la newsletter    */
router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const { title, message, type = 'info' } = req.body
    if (!title || !message) {
      res.status(400).json({ success: false, message: 'Titre et message requis' })
      return
    }
    // Filtrer : seulement les abonnés newsletter actifs (non bannis)
    const users = await prisma.user.findMany({
      where:  { subscribedToNewsletter: true, isBanned: false },
      select: { id: true },
    })
    if (users.length === 0) {
      res.json({ success: true, message: 'Aucun abonné newsletter actif.' })
      return
    }
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title, body: message, type })),
    })
    res.json({ success: true, message: `Notification envoyée à ${users.length} abonné(s) newsletter` })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

export default router
