import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

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

export default router
