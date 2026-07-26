import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth'
import {
  listSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
  MerchantgoError, type SubscriptionPlanBody,
} from '../lib/merchantgo'

const router = Router()
router.use(requireAdmin)

function forward(err: unknown, res: import('express').Response) {
  if (err instanceof MerchantgoError) {
    res.status(err.status).json({ success: false, message: err.message })
    return
  }
  res.status(500).json({ success: false, message: 'Erreur serveur' })
}

const planSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  maxProducts: z.number().int().min(0),
  maxEmployees: z.number().int().min(0),
  maxOrders: z.number().int().min(0),
  storageLimitMb: z.number().int().min(0),
  commissionRate: z.number().min(0).max(100),
  priceMonthly: z.number().int().min(0),
  priceYearly: z.number().int().min(0),
  features: z.string(),
  isActive: z.boolean(),
  position: z.number().int().min(0),
}) satisfies z.ZodType<SubscriptionPlanBody>

/* GET /api/admin/subscription-plans?all=true */
router.get('/', async (req, res) => {
  try {
    const data = await listSubscriptionPlans(req.query.all === 'true')
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* POST /api/admin/subscription-plans */
router.post('/', async (req, res) => {
  try {
    const body = planSchema.parse(req.body)
    const data = await createSubscriptionPlan(body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* PUT /api/admin/subscription-plans/:id */
router.put('/:id', async (req, res) => {
  try {
    const body = planSchema.parse(req.body)
    const data = await updateSubscriptionPlan(req.params.id, body)
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* DELETE /api/admin/subscription-plans/:id */
router.delete('/:id', async (req, res) => {
  try {
    await deleteSubscriptionPlan(req.params.id)
    res.json({ success: true })
  } catch (err) {
    forward(err, res)
  }
})

export default router
