import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validateQuery, zPaginationQuery } from '../middleware/validate'

const router = Router()
router.use(requireAdmin)

/* ── GET /api/audit-log  [ADMIN] ─────────────────────────────── */
router.get('/', validateQuery(zPaginationQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }

    const [total, entries] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    res.json({
      success: true,
      data: {
        entries: entries.map(e => ({ ...e, metadata: e.metadata ? JSON.parse(e.metadata) : null })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
