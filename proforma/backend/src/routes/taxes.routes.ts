import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'

export const taxesRouter = Router()
taxesRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

const taxSchema = z.object({ name: z.string().min(1), rate: z.number().min(0).max(100), isDefault: z.boolean().optional() })

taxesRouter.get('/companies/:companyId/taxes', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const taxes = await prisma.tax.findMany({ where: { companyId: req.params.companyId }, orderBy: { rate: 'asc' } })
  res.json({ success: true, taxes })
})

taxesRouter.post('/companies/:companyId/taxes', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = taxSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  if (parsed.data.isDefault) {
    await prisma.tax.updateMany({ where: { companyId: req.params.companyId }, data: { isDefault: false } })
  }
  const tax = await prisma.tax.create({ data: { ...parsed.data, companyId: req.params.companyId } })
  res.status(201).json({ success: true, tax })
})

taxesRouter.delete('/taxes/:id', async (req: AuthedRequest, res) => {
  const tax = await prisma.tax.findUnique({ where: { id: req.params.id } })
  if (!tax || !(await getMembership(req.userId!, tax.companyId))) return res.status(404).json({ success: false, message: 'Taxe introuvable' })
  await prisma.tax.delete({ where: { id: tax.id } })
  res.json({ success: true })
})

const paymentTermSchema = z.object({ label: z.string().min(1), description: z.string().optional() })

taxesRouter.get('/companies/:companyId/payment-terms', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const paymentTerms = await prisma.paymentTerm.findMany({ where: { companyId: req.params.companyId } })
  res.json({ success: true, paymentTerms })
})

taxesRouter.post('/companies/:companyId/payment-terms', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = paymentTermSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const paymentTerm = await prisma.paymentTerm.create({ data: { ...parsed.data, companyId: req.params.companyId } })
  res.status(201).json({ success: true, paymentTerm })
})

taxesRouter.delete('/payment-terms/:id', async (req: AuthedRequest, res) => {
  const pt = await prisma.paymentTerm.findUnique({ where: { id: req.params.id } })
  if (!pt || !(await getMembership(req.userId!, pt.companyId))) return res.status(404).json({ success: false, message: 'Introuvable' })
  await prisma.paymentTerm.delete({ where: { id: pt.id } })
  res.json({ success: true })
})
