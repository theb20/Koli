import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../lib/mailer'

const router = Router()

/* ── Helpers ─────────────────────────────────────────────────── */

function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `KLI-${date}-${rand}`
}

/* ── Schemas ─────────────────────────────────────────────────── */

const createOrderSchema = z.object({
  // Infos client
  clientPrenom:    z.string().min(2),
  clientNom:       z.string().min(2),
  clientEmail:     z.string().email(),
  clientTelephone: z.string().min(8),

  // Livraison
  deliveryMethod: z.enum(['standard', 'express']),
  shippingAddress: z.object({
    ville:      z.string(),
    quartier:   z.string().optional(),
    adresse:    z.string(),
    instructions: z.string().optional(),
  }),

  // Paiement
  paymentMethod: z.enum(['orange', 'mtn', 'wave', 'cash']),

  // Articles
  items: z.array(z.object({
    productId: z.number().int().positive(),
    qty:       z.number().int().positive(),
    color:     z.string().optional(),
  })).min(1, 'Le panier est vide'),

  // Promo
  promoCode: z.string().optional(),
  notes:     z.string().max(500).optional(),
})

/* ─────────────────────────────────────────────────────────────
   POST /api/orders  — Créer une commande
───────────────────────────────────────────────────────────── */
router.post('/', optionalAuth, validate(createOrderSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof createOrderSchema>

    // 1. Récupérer les produits et vérifier le stock
    const productIds = body.items.map(i => i.productId)
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    })

    if (products.length !== productIds.length) {
      res.status(400).json({ success: false, message: 'Un ou plusieurs produits sont introuvables' })
      return
    }

    // Vérifier le stock
    for (const item of body.items) {
      const p = products.find(p => p.id === item.productId)!
      if (p.stock !== null && p.stock < item.qty) {
        res.status(400).json({ success: false, message: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock})` })
        return
      }
    }

    // 2. Calculer les totaux
    const subtotal = body.items.reduce((sum, item) => {
      const p = products.find(p => p.id === item.productId)!
      return sum + p.price * item.qty
    }, 0)

    const shippingCost = (() => {
      if (subtotal >= 2_500_000) return 0        // livraison gratuite
      return body.deliveryMethod === 'express' ? 350_000 : 150_000
    })()

    // 3. Valider le code promo
    let promoDiscount = 0
    let validatedCode: string | null = null
    if (body.promoCode) {
      const now = new Date()
      const promo = await prisma.promoCode.findFirst({
        where: {
          code:     body.promoCode.toUpperCase(),
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: [{ maxUses: null }, { maxUses: { gt: 0 } }] },
          ],
        },
      })
      if (promo && subtotal >= promo.minOrder) {
        promoDiscount = promo.type === 'percent'
          ? Math.round(subtotal * promo.value / 100)
          : promo.value
        validatedCode = promo.code
        await prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
      }
    }

    const total = subtotal - promoDiscount + shippingCost

    // 4. Créer la commande
    const orderNumber = generateOrderNumber()
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId:          req.user?.userId ?? null,
        clientPrenom:    body.clientPrenom,
        clientNom:       body.clientNom,
        clientEmail:     body.clientEmail,
        clientTelephone: body.clientTelephone,
        deliveryMethod:  body.deliveryMethod,
        shippingAddress: JSON.stringify(body.shippingAddress),
        shippingCost,
        paymentMethod:   body.paymentMethod,
        subtotal,
        promoCode:       validatedCode,
        promoDiscount,
        total,
        notes:           body.notes,
        items: {
          create: body.items.map(item => {
            const p = products.find(p => p.id === item.productId)!
            return {
              productId: p.id,
              name:      p.name,
              brand:     p.brand,
              price:     p.price,
              qty:       item.qty,
              image:     p.images[0]?.url ?? '',
              color:     item.color,
            }
          }),
        },
      },
      include: { items: true },
    })

    // 5. Décrémenter le stock
    await Promise.all(
      body.items.map(item =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty }, sold: { increment: item.qty } },
        })
      )
    )

    // 6. Notification en base (si utilisateur connecté)
    if (req.user?.userId) {
      await prisma.notification.create({
        data: {
          userId: req.user.userId,
          type:   'order',
          title:  'Commande reçue',
          body:   `Votre commande ${orderNumber} a bien été reçue.`,
          link:   `/commandes/${orderNumber}`,
        },
      })
    }

    // 7. Email de confirmation (sans bloquer)
    sendOrderConfirmationEmail(body.clientEmail, {
      orderNumber,
      prenom:        body.clientPrenom,
      items:         order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total,
      paymentMethod: body.paymentMethod,
      deliveryMethod: body.deliveryMethod,
    }).catch(() => {})

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        orderNumber: order.orderNumber,
        orderId:     order.id,
        total,
        shippingCost,
        promoDiscount,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la commande' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders  — Mes commandes
───────────────────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const page   = parseInt(req.query['page'] as string) || 1
    const limit  = parseInt(req.query['limit'] as string) || 10
    const status = req.query['status'] as string | undefined

    const where = {
      userId: req.user!.userId,
      ...(status ? { status } : {}),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: {
            select: { id: true, name: true, qty: true, price: true, image: true },
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/:id  — Détail commande
───────────────────────────────────────────────────────────── */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: req.params['id'] },
          { orderNumber: req.params['id'] },
        ],
        // Si connecté : doit être sa commande
        ...(req.user ? { userId: req.user.userId } : {}),
      },
      include: { items: true },
    })

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    res.json({ success: true, data: order })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/cancel  — Annuler une commande
───────────────────────────────────────────────────────────── */
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params['id'] }, { orderNumber: req.params['id'] }], userId: req.user!.userId },
    })

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      res.status(400).json({ success: false, message: 'Cette commande ne peut plus être annulée' })
      return
    }

    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } })

    res.json({ success: true, message: 'Commande annulée' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/orders/:id/status  [ADMIN]
───────────────────────────────────────────────────────────── */
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ status: z.enum(['pending','confirmed','preparing','shipped','delivered','cancelled']) })
    const { status } = schema.parse(req.body)

    const order = await prisma.order.findUnique({
      where: { id: req.params['id'] },
    })
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }

    await prisma.order.update({ where: { id: order.id }, data: { status } })

    // Email de mise à jour
    sendOrderStatusEmail(order.clientEmail, order.clientPrenom, order.orderNumber, status).catch(() => {})

    // Notification si user connecté
    if (order.userId) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'order',
          title: `Commande ${order.orderNumber} mise à jour`,
          body: `Nouveau statut : ${status}`,
          link: `/commandes/${order.orderNumber}`,
        },
      })
    }

    res.json({ success: true, message: 'Statut mis à jour' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/admin/all  [ADMIN]
───────────────────────────────────────────────────────────── */
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page   = parseInt(req.query['page'] as string) || 1
    const limit  = parseInt(req.query['limit'] as string) || 20
    const status = req.query['status'] as string | undefined
    const q      = req.query['q'] as string | undefined

    const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ orderNumber: { contains: q } }, { clientEmail: { contains: q } }, { clientTelephone: { contains: q } }] } : {}),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { items: { select: { name: true, qty: true } } },
      }),
    ])

    res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
