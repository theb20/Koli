import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

/* ── GET /api/promo/:code — Valider un code ────────────────── */
router.get('/:code', async (req, res) => {
  try {
    const code  = req.params['code']!.toUpperCase()
    const total = parseInt(req.query['total'] as string) || 0  // montant du panier

    const promo = await prisma.promoCode.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!promo) {
      res.status(404).json({ success: false, message: 'Code promo invalide ou expiré' })
      return
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ success: false, message: 'Ce code a atteint sa limite d\'utilisation' })
      return
    }

    if (total > 0 && total < promo.minOrder) {
      res.status(400).json({
        success: false,
        message: `Commande minimum de ${(promo.minOrder / 100).toLocaleString('fr-FR')} FCFA requise`,
      })
      return
    }

    const discount = promo.type === 'percent'
      ? Math.round(total * promo.value / 100)
      : promo.value

    res.json({
      success: true,
      data: {
        code:     promo.code,
        type:     promo.type,
        value:    promo.value,
        discount,
        minOrder: promo.minOrder,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/promo  [ADMIN] — Créer un code ─────────────── */
router.post('/', requireAdmin, validate(z.object({
  code:      z.string().min(3).max(20).toUpperCase(),
  type:      z.enum(['percent', 'fixed']),
  value:     z.coerce.number().int().positive(),
  minOrder:  z.coerce.number().int().nonnegative().default(0),
  maxUses:   z.coerce.number().int().positive().optional(),
  /* Accepte un ISO complet ou une date seule — on parse en Date dans le handler */
  expiresAt: z.string().optional(),
})), async (req, res) => {
  try {
    const data = req.body as {
      code: string; type: string; value: number
      minOrder: number; maxUses?: number; expiresAt?: string
    }
    const promo = await prisma.promoCode.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })
    res.status(201).json({ success: true, data: promo })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/promo  [ADMIN] — Lister les codes ──────────── */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: promos })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/promo/:id  [ADMIN] ───────────────────────── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.promoCode.update({
      where: { id: parseInt(req.params['id'] ?? '') },
      data:  { isActive: false },
    })
    res.json({ success: true, message: 'Code promo désactivé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── GET /api/promo/admin/all  [ADMIN] ──────────────────────── */
router.get('/admin/all', requireAdmin, async (_req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: { promos } })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

/* ── PATCH /api/promo/:id/toggle  [ADMIN] ──────────────────── */
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body
    const promo = await prisma.promoCode.update({ where: { id: parseInt(req.params['id']!) }, data: { isActive } })
    res.json({ success: true, data: { promo } })
  } catch { res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

export default router
