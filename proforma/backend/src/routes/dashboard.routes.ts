import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

dashboardRouter.get('/companies/:companyId/dashboard', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const companyId = req.params.companyId

  const [statusGroups, totalAgg, recentProformas, recentClients, sixMonthsAgo] = await Promise.all([
    prisma.proforma.groupBy({ by: ['status'], where: { companyId }, _count: { _all: true } }),
    prisma.proforma.aggregate({ where: { companyId }, _sum: { total: true }, _count: { _all: true } }),
    prisma.proforma.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { client: { select: { name: true } } },
    }),
    prisma.client.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    Promise.resolve(new Date(new Date().setMonth(new Date().getMonth() - 5, 1))),
  ])

  const monthlyRaw = await prisma.proforma.findMany({
    where: { companyId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, total: true, status: true },
  })

  const months: { key: string; label: string; count: number; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: d.toLocaleDateString('fr-FR', { month: 'short' }), count: 0, total: 0 })
  }
  for (const p of monthlyRaw) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
    const bucket = months.find((m) => m.key === key)
    if (bucket) {
      bucket.count += 1
      bucket.total += p.total
    }
  }

  const activity = await prisma.activityLog.findMany({
    where: { OR: [{ proforma: { companyId } }, { invoice: { companyId } }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { proforma: { select: { number: true } }, invoice: { select: { number: true } } },
  })

  const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]))

  res.json({
    success: true,
    stats: {
      totalCount: totalAgg._count._all,
      totalAmount: totalAgg._sum.total || 0,
      draft: counts.DRAFT || 0,
      sent: (counts.SENT || 0) + (counts.VIEWED || 0) + (counts.PENDING || 0),
      accepted: counts.ACCEPTED || 0,
      refused: counts.REFUSED || 0,
      expired: counts.EXPIRED || 0,
      converted: counts.CONVERTED || 0,
    },
    monthly: months,
    recentProformas,
    recentClients,
    activity,
  })
})
