import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { notificationBus } from '../lib/notifications.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req: AuthedRequest, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId: req.userId, isRead: false } }),
  ])
  res.json({ success: true, notifications, unreadCount })
})

notificationsRouter.post('/:id/read', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.userId }, data: { isRead: true } })
  res.json({ success: true })
})

notificationsRouter.post('/read-all', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId, isRead: false }, data: { isRead: true } })
  res.json({ success: true })
})

/**
 * Flux Server-Sent Events : la connexion reste ouverte, le serveur pousse
 * chaque nouvelle notification dès qu'elle est créée (voir lib/notifications.ts).
 * EventSource ne permet pas d'en-tête Authorization : l'authentification
 * passe donc par le cookie httpOnly posé à la connexion (requireAuth le lit
 * déjà en repli) — le client doit ouvrir l'EventSource avec withCredentials.
 */
notificationsRouter.get('/stream', async (req: AuthedRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const userId = req.userId!
  const onNotification = (notification: unknown) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`)
  }
  notificationBus.on(`user:${userId}`, onNotification)

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    notificationBus.off(`user:${userId}`, onNotification)
  })
})
