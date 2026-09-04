import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { toMinorUnits, type Currency } from '../lib/money.js'

export const productsRouter = Router()
productsRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

const productSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(), // en unité majeure (ex: 450000 FCFA), converti ici
  unit: z.string().optional(),
  defaultTaxId: z.string().nullable().optional(),
  currency: z.enum(['XOF', 'EUR', 'USD', 'GBP']).default('XOF'),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
})

productsRouter.get('/companies/:companyId/products', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const q = String(req.query.q || '').trim()
  const products = await prisma.product.findMany({
    where: {
      companyId: req.params.companyId,
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { reference: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: { defaultTax: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, products })
})

productsRouter.post('/companies/:companyId/products', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const { currency, unitPrice, ...rest } = parsed.data
  const product = await prisma.product.create({
    data: { ...rest, unitPrice: toMinorUnits(unitPrice, currency as Currency), companyId: req.params.companyId },
  })
  res.status(201).json({ success: true, product })
})

async function loadOwnedProduct(userId: string, id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return null
  if (!(await getMembership(userId, product.companyId))) return null
  return product
}

productsRouter.put('/products/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProduct(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Produit introuvable' })
  const parsed = productSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const { currency, unitPrice, ...rest } = parsed.data
  const product = await prisma.product.update({
    where: { id: owned.id },
    data: { ...rest, ...(unitPrice !== undefined ? { unitPrice: toMinorUnits(unitPrice, (currency as Currency) || 'XOF') } : {}) },
  })
  res.json({ success: true, product })
})

productsRouter.delete('/products/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProduct(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Produit introuvable' })
  await prisma.product.delete({ where: { id: owned.id } })
  res.json({ success: true })
})

// Ajustement manuel de stock (réception de marchandise, inventaire...)
const stockAdjustSchema = z.object({ delta: z.number().int() })
productsRouter.post('/products/:id/stock-adjust', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProduct(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Produit introuvable' })
  const parsed = stockAdjustSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Ajustement invalide' })
  const product = await prisma.product.update({
    where: { id: owned.id },
    data: { stockQuantity: Math.max(0, owned.stockQuantity + parsed.data.delta) },
  })
  res.json({ success: true, product })
})
