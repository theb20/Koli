/* ─────────────────────────────────────────────────────────────
   Vue d'ensemble du backoffice (koli-admin) — agrégats calculés côté
   serveur, en remplacement des calculs faits dans le navigateur sur les
   200 dernières commandes. Routes AJOUTÉES : aucun contrat existant
   n'est modifié. Les candidatures marchands vivent dans merchantgo et
   restent servies par /api/admin/merchant-applications.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'

const router = Router()
router.use(requireAdmin)

/* ── GET /api/admin/overview/counters — pastilles de la sidebar ── */
router.get('/counters', async (req, res) => {
  try {
    const [pendingOrders, requestedReturns, newProductRequests, unreadContacts, unreadNotifications] = await Promise.all([
      prisma.order.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.orderReturn.count({ where: { status: 'requested' } }),
      prisma.productRequest.count({ where: { status: 'new' } }),
      prisma.contactMessage.count({ where: { status: 'new' } }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ])
    res.json({ success: true, data: { pendingOrders, requestedReturns, newProductRequests, unreadContacts, unreadNotifications } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
