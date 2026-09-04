import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { createProformaFromContent, type ProformaContent } from '../lib/proformaBuilder.js'
import type { Currency } from '../lib/money.js'

export const templatesRouter = Router()
templatesRouter.use(requireAuth)

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

const templateSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().nullable().optional(),
  content: contentSchema,
})

templatesRouter.get('/companies/:companyId/proforma-templates', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const templates = await prisma.proformaTemplate.findMany({
    where: { companyId: req.params.companyId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, templates })
})

templatesRouter.post('/companies/:companyId/proforma-templates', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const template = await prisma.proformaTemplate.create({
    data: { companyId: req.params.companyId, name: parsed.data.name, clientId: parsed.data.clientId || null, content: parsed.data.content },
  })
  res.status(201).json({ success: true, template })
})

async function loadOwnedTemplate(userId: string, id: string) {
  const template = await prisma.proformaTemplate.findUnique({ where: { id } })
  if (!template) return null
  if (!(await getMembership(userId, template.companyId))) return null
  return template
}

templatesRouter.delete('/proforma-templates/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedTemplate(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Modèle introuvable' })
  await prisma.proformaTemplate.delete({ where: { id: owned.id } })
  res.json({ success: true })
})

// Crée immédiatement une nouvelle proforma (brouillon) à partir du modèle.
const useTemplateSchema = z.object({ clientId: z.string().min(1), currency: z.enum(['XOF', 'EUR', 'USD', 'GBP']).default('XOF') })
templatesRouter.post('/proforma-templates/:id/use', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedTemplate(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Modèle introuvable' })

  const parsed = useTemplateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Client requis' })

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: owned.companyId } })
  if (!client) return res.status(400).json({ success: false, message: 'Client invalide pour cette entreprise' })

  const proforma = await createProformaFromContent({
    companyId: owned.companyId,
    clientId: client.id,
    currency: parsed.data.currency as Currency,
    content: owned.content as unknown as ProformaContent,
    activityLabel: `Créée à partir du modèle "${owned.name}"`,
  })

  res.status(201).json({ success: true, proforma })
})
