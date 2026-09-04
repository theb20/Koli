import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'

export const recurringRouter = Router()
recurringRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

const contentSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().nullable().optional(),
        reference: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().positive(),
        unit: z.string().default('unité'),
        unitPrice: z.number().nonnegative(),
        discountPercent: z.number().min(0).max(100).default(0),
        taxId: z.string().nullable().optional(),
        taxRate: z.number().min(0).max(100).default(0),
      })
    )
    .min(1),
  discountType: z.enum(['percent', 'amount']).default('percent'),
  discountValue: z.number().min(0).default(0),
  shippingFee: z.number().min(0).default(0),
  otherFees: z.number().min(0).default(0),
  otherFeesLabel: z.string().optional(),
  deposit: z.number().min(0).default(0),
  template: z.string().default('classic'),
  customization: z.record(z.any()).nullable().optional(),
  notes: z.string().optional(),
  termsText: z.string().optional(),
  footerText: z.string().optional(),
  paymentTermId: z.string().nullable().optional(),
  expiryDays: z.number().int().positive().optional(),
  deliveryDelay: z.string().optional(),
  object: z.string().optional(),
  salesperson: z.string().optional(),
})

const planSchema = z.object({
  clientId: z.string().min(1),
  label: z.string().min(1),
  interval: z.enum(['monthly', 'quarterly', 'yearly']),
  nextRunAt: z.string(),
  currency: z.enum(['XOF', 'EUR', 'USD', 'GBP']).default('XOF'),
  content: contentSchema,
})

recurringRouter.get('/companies/:companyId/recurring-plans', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const plans = await prisma.recurringPlan.findMany({
    where: { companyId: req.params.companyId },
    include: { client: { select: { name: true } }, _count: { select: { generatedProformas: true } } },
    orderBy: { nextRunAt: 'asc' },
  })
  res.json({ success: true, plans })
})

recurringRouter.post('/companies/:companyId/recurring-plans', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = planSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: req.params.companyId } })
  if (!client) return res.status(400).json({ success: false, message: 'Client invalide pour cette entreprise' })

  const plan = await prisma.recurringPlan.create({
    data: {
      companyId: req.params.companyId,
      clientId: parsed.data.clientId,
      label: parsed.data.label,
      interval: parsed.data.interval,
      nextRunAt: new Date(parsed.data.nextRunAt),
      currency: parsed.data.currency,
      content: parsed.data.content,
    },
  })
  res.status(201).json({ success: true, plan })
})

async function loadOwnedPlan(userId: string, id: string) {
  const plan = await prisma.recurringPlan.findUnique({ where: { id } })
  if (!plan) return null
  if (!(await getMembership(userId, plan.companyId))) return null
  return plan
}

recurringRouter.put('/recurring-plans/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedPlan(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Plan introuvable' })
  const parsed = planSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const { nextRunAt, ...rest } = parsed.data
  const plan = await prisma.recurringPlan.update({
    where: { id: owned.id },
    data: { ...rest, ...(nextRunAt ? { nextRunAt: new Date(nextRunAt) } : {}) },
  })
  res.json({ success: true, plan })
})

recurringRouter.post('/recurring-plans/:id/toggle', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedPlan(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Plan introuvable' })
  const plan = await prisma.recurringPlan.update({ where: { id: owned.id }, data: { active: !owned.active } })
  res.json({ success: true, plan })
})

recurringRouter.delete('/recurring-plans/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedPlan(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Plan introuvable' })
  await prisma.recurringPlan.delete({ where: { id: owned.id } })
  res.json({ success: true })
})
