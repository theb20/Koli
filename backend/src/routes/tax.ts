import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zCuidIdParam } from '../middleware/validate'
import { cacheControl } from '../middleware/cache'

const router = Router()

const taxSchema = z.object({
  name:      z.string().min(2).max(80),
  rate:      z.coerce.number().min(0).max(100),
  isDefault: z.boolean().optional().default(false),
  isActive:  z.boolean().optional().default(true),
})

/* ── GET /api/tax  — liste publique (pour le checkout) ───── */
router.get('/', cacheControl(300), async (_req, res) => {
  try {
    const taxes = await prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, data: { taxes } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/tax/default  — taux actif par défaut ────────── */
router.get('/default', cacheControl(300), async (_req, res) => {
  try {
    const tax = await prisma.taxRate.findFirst({
      where: { isDefault: true, isActive: true },
    })
    res.json({ success: true, data: { tax: tax ?? null } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/tax/admin/all  [ADMIN] ───────────────────────── */
router.get('/admin/all', requireAdmin, async (_req, res) => {
  try {
    const taxes = await prisma.taxRate.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: { taxes } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/tax  [ADMIN] ────────────────────────────────── */
router.post('/', requireAdmin, validate(taxSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof taxSchema>
    // Si ce taux devient défaut, désactiver les autres
    if (data.isDefault) {
      await prisma.taxRate.updateMany({ data: { isDefault: false } })
    }
    const tax = await prisma.taxRate.create({ data })
    res.status(201).json({ success: true, data: { tax } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/tax/:id  [ADMIN] ─────────────────────────────── */
router.put('/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const data = taxSchema.partial().parse(req.body)
    if (data.isDefault) {
      await prisma.taxRate.updateMany({ data: { isDefault: false } })
    }
    const tax = await prisma.taxRate.update({ where: { id: req.params['id']! }, data })
    res.json({ success: true, data: { tax } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/tax/:id/default  [ADMIN] ───────────────────── */
router.patch('/:id/default', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.taxRate.updateMany({ data: { isDefault: false } })
    const tax = await prisma.taxRate.update({
      where: { id: req.params['id']! },
      data:  { isDefault: true, isActive: true },
    })
    res.json({ success: true, data: { tax } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PATCH /api/tax/:id/toggle  [ADMIN] ────────────────────── */
router.patch('/:id/toggle', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const existing = await prisma.taxRate.findUnique({ where: { id: req.params['id']! } })
    if (!existing) { res.status(404).json({ success: false, message: 'Taux introuvable' }); return }
    const tax = await prisma.taxRate.update({
      where: { id: req.params['id']! },
      data:  { isActive: !existing.isActive },
    })
    res.json({ success: true, data: { tax } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/tax/:id  [ADMIN] ──────────────────────────── */
router.delete('/:id', requireAdmin, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.taxRate.delete({ where: { id: req.params['id']! } })
    res.json({ success: true, message: 'Taux supprimé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
