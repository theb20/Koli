import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate, validateParams, zCuidIdParam } from '../middleware/validate'

const router = Router()

const addressSchema = z.object({
  label:     z.enum(['Domicile', 'Bureau', 'Autre']),
  prenom:    z.string().min(2),
  nom:       z.string().min(2),
  telephone: z.string().min(8),
  ville:     z.string().min(2),
  quartier:  z.string().optional(),
  adresse:   z.string().min(5),
  isDefault: z.boolean().optional(),
})

/* ── GET /api/addresses ─────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  })
  res.json({ success: true, data: addresses })
})

/* ── POST /api/addresses ────────────────────────────────────── */
router.post('/', requireAuth, validate(addressSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof addressSchema>
    const userId = req.user!.userId

    // Si nouvelle adresse par défaut → reset les autres
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    // Si première adresse → auto-default
    const count = await prisma.address.count({ where: { userId } })
    const isDefault = data.isDefault ?? (count === 0)

    const address = await prisma.address.create({ data: { ...data, userId, isDefault } })
    res.status(201).json({ success: true, data: address })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/addresses/:id ─────────────────────────────────── */
router.put('/:id', requireAuth, validateParams(zCuidIdParam), validate(addressSchema), async (req, res) => {
  try {
    const data    = req.body as z.infer<typeof addressSchema>
    const userId  = req.user!.userId

    const existing = await prisma.address.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) {
      res.status(404).json({ success: false, message: 'Adresse introuvable' })
      return
    }

    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    const updated = await prisma.address.update({
      where: { id: req.params['id'] },
      data: { ...data, isDefault: data.isDefault ?? existing.isDefault },
    })
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── PUT /api/addresses/:id/default ────────────────────────── */
router.put('/:id/default', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const userId = req.user!.userId
    const addr   = await prisma.address.findFirst({ where: { id: req.params['id'], userId } })
    if (!addr) {
      res.status(404).json({ success: false, message: 'Adresse introuvable' })
      return
    }
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
    await prisma.address.update({ where: { id: req.params['id'] }, data: { isDefault: true } })
    res.json({ success: true, message: 'Adresse par défaut mise à jour' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/addresses/:id ──────────────────────────────── */
router.delete('/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const addr = await prisma.address.findFirst({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    if (!addr) {
      res.status(404).json({ success: false, message: 'Adresse introuvable' })
      return
    }
    await prisma.address.delete({ where: { id: req.params['id'] } })
    res.json({ success: true, message: 'Adresse supprimée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
