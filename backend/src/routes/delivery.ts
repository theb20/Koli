import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { validateParams, zOrderNumberParam } from '../middleware/validate'

const router = Router()

const DEFAULT_STEPS = [
  { label: 'Commande reçue',       done: true,  timestamp: null },
  { label: 'Prise en charge SAV',  done: false, timestamp: null },
  { label: 'En cours de livraison',done: false, timestamp: null },
  { label: 'Livré',                done: false, timestamp: null },
]

/* GET /api/delivery/:orderNumber — suivi public */
router.get('/:orderNumber', requireAuth, validateParams(zOrderNumberParam), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: req.params['orderNumber'] }, { id: req.params['orderNumber'] }],
        userId: req.user!.userId,
      },
      include: { delivery: true },
    })
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable.' })
      return
    }

    let steps = DEFAULT_STEPS
    if (order.delivery?.steps) {
      try { steps = JSON.parse(order.delivery.steps) } catch { /* ignore */ }
    } else {
      // auto-compléter les étapes selon le statut
      const idx = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.status)
      steps = DEFAULT_STEPS.map((s, i) => ({ ...s, done: i <= idx }))
    }

    res.json({
      success: true,
      data: {
        orderNumber:  order.orderNumber,
        status:       order.status,
        driverName:   order.delivery?.driverName ?? null,
        driverPhone:  order.delivery?.driverPhone ?? null,
        photo:        order.delivery?.photo ?? null,
        steps,
        estimatedDelivery: null,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* PATCH /api/delivery/:orderNumber  [ADMIN] — mettre à jour le suivi */
router.patch('/:orderNumber', requireAdmin, validateParams(zOrderNumberParam), async (req, res) => {
  try {
    const body = z.object({
      driverName:  z.string().optional(),
      driverPhone: z.string().optional(),
      photo:       z.string().optional(),
      steps:       z.array(z.object({
        label:     z.string(),
        done:      z.boolean(),
        timestamp: z.string().nullable().optional(),
      })).optional(),
    }).parse(req.body)

    const order = await prisma.order.findFirst({
      where: { OR: [{ orderNumber: req.params['orderNumber'] }, { id: req.params['orderNumber'] }] },
    })
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable.' })
      return
    }

    const delivery = await prisma.delivery.upsert({
      where:  { orderId: order.id },
      update: {
        ...(body.driverName  ? { driverName: body.driverName }   : {}),
        ...(body.driverPhone ? { driverPhone: body.driverPhone } : {}),
        ...(body.photo       ? { photo: body.photo }             : {}),
        ...(body.steps       ? { steps: JSON.stringify(body.steps) } : {}),
      },
      create: {
        orderId:     order.id,
        driverName:  body.driverName,
        driverPhone: body.driverPhone,
        photo:       body.photo,
        steps:       JSON.stringify(body.steps ?? DEFAULT_STEPS),
      },
    })
    res.json({ success: true, data: { delivery } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
