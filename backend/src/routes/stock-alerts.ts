import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { optionalAuth } from '../middleware/auth'

const router = Router()

/* POST /api/stock-alerts — s'abonner */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { productId, email } = z.object({
      productId: z.number().int().positive(),
      email:     z.string().email(),
    }).parse(req.body)

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true, stock: true, name: true },
    })
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable.' })
      return
    }
    if (product.stock > 0) {
      res.status(400).json({ success: false, message: 'Ce produit est déjà en stock !' })
      return
    }

    await prisma.stockAlert.upsert({
      where:  { email_productId: { email: email.toLowerCase(), productId } },
      update: { sent: false },
      create: {
        email:     email.toLowerCase(),
        productId,
        userId:    req.user?.userId ?? null,
        sent:      false,
      },
    })
    res.json({ success: true, message: `Vous serez alerté(e) dès que "${product.name}" sera de nouveau disponible.` })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* DELETE /api/stock-alerts/:productId — se désabonner */
router.delete('/:productId', optionalAuth, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const productId = parseInt(req.params['productId']!)
    await prisma.stockAlert.deleteMany({
      where: { email: email.toLowerCase(), productId },
    })
    res.json({ success: true, message: 'Alerte supprimée.' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/stock-alerts/check/:productId — vérifier si alerte active */
router.get('/check/:productId', optionalAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params['productId']!)
    const { email } = z.object({ email: z.string().email() }).parse(req.query)
    const alert = await prisma.stockAlert.findUnique({
      where: { email_productId: { email: email.toLowerCase(), productId } },
    })
    res.json({ success: true, data: { subscribed: !!alert && !alert.sent } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
