import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'

export const clientsRouter = Router()
clientsRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

const clientSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  country: z.string().optional(),
  taxId: z.string().optional(),
  rccm: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

clientsRouter.get('/companies/:companyId/clients', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const q = String(req.query.q || '').trim()
  const clients = await prisma.client.findMany({
    where: {
      companyId: req.params.companyId,
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { proformas: true, invoices: true } } },
  })
  res.json({ success: true, clients })
})

clientsRouter.post('/companies/:companyId/clients', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = clientSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const client = await prisma.client.create({ data: { ...parsed.data, companyId: req.params.companyId } })
  res.status(201).json({ success: true, client })
})

async function loadOwnedClient(userId: string, id: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return null
  if (!(await getMembership(userId, client.companyId))) return null
  return client
}

clientsRouter.get('/clients/:id', async (req: AuthedRequest, res) => {
  const client = await loadOwnedClient(req.userId!, req.params.id)
  if (!client) return res.status(404).json({ success: false, message: 'Client introuvable' })

  const [proformas, invoices] = await Promise.all([
    prisma.proforma.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, number: true, status: true, total: true, currency: true, issueDate: true },
    }),
    prisma.invoice.findMany({
      where: { clientId: client.id },
      select: { total: true, status: true, currency: true, issueDate: true, paidAt: true },
    }),
  ])

  // Fiche client enrichie : CA réalisé, taux d'acceptation, délai moyen de paiement.
  const respondedStatuses = ['ACCEPTED', 'REFUSED', 'CONVERTED', 'EXPIRED']
  const responded = proformas.filter((p) => respondedStatuses.includes(p.status))
  const accepted = responded.filter((p) => p.status === 'ACCEPTED' || p.status === 'CONVERTED')
  const acceptanceRate = responded.length > 0 ? Math.round((accepted.length / responded.length) * 100) : null

  const paidInvoices = invoices.filter((i) => i.paidAt)
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0)
  const avgPaymentDelayDays =
    paidInvoices.length > 0
      ? Math.round(
          paidInvoices.reduce((sum, i) => sum + (i.paidAt!.getTime() - i.issueDate.getTime()), 0) / paidInvoices.length / 86_400_000
        )
      : null

  res.json({
    success: true,
    client,
    proformas,
    stats: {
      acceptanceRate,
      respondedCount: responded.length,
      totalRevenue,
      currency: invoices[0]?.currency || proformas[0]?.currency || 'XOF',
      avgPaymentDelayDays,
      paidInvoicesCount: paidInvoices.length,
    },
  })
})

clientsRouter.put('/clients/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedClient(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Client introuvable' })
  const parsed = clientSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const client = await prisma.client.update({ where: { id: owned.id }, data: parsed.data })
  res.json({ success: true, client })
})

clientsRouter.delete('/clients/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedClient(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Client introuvable' })
  await prisma.client.delete({ where: { id: owned.id } })
  res.json({ success: true })
})
