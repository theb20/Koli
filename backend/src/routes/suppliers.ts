/* ─────────────────────────────────────────────────────────────
   Fournisseurs du catalogue Skignas [ADMIN] — /api/admin/suppliers.
   Le mode et le taux ne s'appliquent qu'aux commandes PAYÉES APRÈS leur
   modification : les lignes déjà payées ont figé les leurs
   (OrderItemFinancials). Un fournisseur ayant des produits ou des ventes
   ne se supprime pas (historique) : on le désactive.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zIntIdParam } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { SUPPLIER_MODES } from '../lib/finance/formulas'

const router = Router()
router.use(requireAdmin)

const supplierSchema = z.object({
  name:           z.string().trim().min(2).max(120),
  contactName:    z.string().trim().max(120).nullable().optional(),
  phone:          z.string().trim().max(40).nullable().optional(),
  email:          z.string().trim().email().nullable().optional().or(z.literal('')),
  mode:           z.enum(SUPPLIER_MODES).default('MARGIN'),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  isActive:       z.boolean().optional(),
  notes:          z.string().max(2000).nullable().optional(),
})

/** Un fournisseur à la commission doit avoir un taux — sinon ses ventes seraient toutes « coût inconnu ». */
function commissionError(d: { mode?: string; commissionRate?: number | null }): string | null {
  return d.mode === 'COMMISSION' && d.commissionRate == null ? 'Un taux de commission est requis en mode commission' : null
}

const checked = supplierSchema.superRefine((d, ctx) => {
  const err = commissionError(d)
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ['commissionRate'] })
})

const clean = <T extends { email?: string | null }>(d: T) => ({ ...d, email: d.email || null })

/* ── GET /api/admin/suppliers ── */
router.get('/', async (_req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    })
    const missing = await prisma.productSourcing.groupBy({
      by: ['supplierId'], where: { supplierPrice: null, supplierId: { not: null } }, _count: { _all: true },
    })
    res.json({ success: true, data: { suppliers: suppliers.map(({ _count, ...s }) => ({
      ...s,
      productCount: _count.products,
      // Seul le mode MARGIN a besoin d'un prix d'achat
      missingPriceCount: s.mode === 'MARGIN' ? missing.find(m => m.supplierId === s.id)?._count._all ?? 0 : 0,
    })) } })
  } catch (err) {
    logger.error('[suppliers] list', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/admin/suppliers ── */
router.post('/', validate(checked), async (req, res) => {
  try {
    const data = clean(req.body as z.infer<typeof supplierSchema>)
    const supplier = await prisma.supplier.create({ data })
    logAdminAction(req, { action: 'supplier.create', targetType: 'Supplier', targetId: String(supplier.id), metadata: { name: data.name, mode: data.mode, commissionRate: data.commissionRate } })
    res.status(201).json({ success: true, data: { supplier } })
  } catch (err) {
    logger.error('[suppliers] create', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/admin/suppliers/:id ── */
router.put('/:id', validateParams(zIntIdParam), validate(supplierSchema.partial()), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const data = req.body as Partial<z.infer<typeof supplierSchema>>
    const current = await prisma.supplier.findUnique({ where: { id } })
    if (!current) { res.status(404).json({ success: false, message: 'Fournisseur introuvable' }); return }
    const err = commissionError({
      mode:           data.mode ?? current.mode,
      commissionRate: 'commissionRate' in data ? data.commissionRate : current.commissionRate,
    })
    if (err) { res.status(400).json({ success: false, message: err }); return }
    const supplier = await prisma.supplier.update({ where: { id }, data: 'email' in data ? clean(data) : data })
    logAdminAction(req, { action: 'supplier.update', targetType: 'Supplier', targetId: String(id), metadata: data })
    res.json({ success: true, data: { supplier } })
  } catch (err) {
    logger.error('[suppliers] update', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/admin/suppliers/:id — seulement sans produit ni vente ── */
router.delete('/:id', validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const [products, sales] = await Promise.all([
      prisma.productSourcing.count({ where: { supplierId: id } }),
      prisma.orderItemFinancials.count({ where: { supplierId: id } }),
    ])
    if (products + sales > 0) {
      res.status(409).json({ success: false, message: 'Ce fournisseur a des produits ou des ventes : désactivez-le plutôt que de le supprimer.' })
      return
    }
    await prisma.supplier.delete({ where: { id } })
    logAdminAction(req, { action: 'supplier.delete', targetType: 'Supplier', targetId: String(id) })
    res.json({ success: true })
  } catch (err) {
    logger.error('[suppliers] delete', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
