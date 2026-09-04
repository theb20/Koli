/* ─────────────────────────────────────────────────────────────
   Panier persistant côté serveur, réservé aux utilisateurs connectés — un
   invité (pas de compte) continue d'utiliser le localStorage du navigateur
   seul, comme avant (voir koili/src/contexts/CartContext.tsx). Même
   principe que wishlist.ts : une ligne par produit (userId, productId).
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate, validateParams, zProductIdParam } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

const cartItemInclude = {
  product: {
    include: { images: { take: 1, orderBy: { position: 'asc' as const } } },
  },
}

/* ── GET /api/cart ──────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId, product: { isActive: true } },
      orderBy: { createdAt: 'asc' },
      include: cartItemInclude,
    })
    res.json({ success: true, data: items })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const mergeSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    qty:       z.number().int().positive(),
    color:     z.string().optional(),
  })).max(200),
})

/**
 * POST /api/cart/merge — appelé une fois juste après connexion, avec le
 * panier localStorage de l'invité (s'il y en avait un) : fusionne dans le
 * panier serveur (quantités additionnées, clampées au stock) puis renvoie
 * le panier serveur complet. Le frontend vide ensuite son localStorage et
 * bascule sur le panier serveur comme source de vérité.
 * DOIT être déclaré avant POST /:productId — sinon "merge" est capturé
 * comme un productId et rejeté par validateParams (déjà vu sur ce projet).
 */
router.post('/merge', validate(mergeSchema), async (req, res) => {
  try {
    const { items } = req.body as z.infer<typeof mergeSchema>
    const userId = req.user!.userId

    for (const { productId, qty, color } of items) {
      const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } })
      if (!product) continue

      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
      })
      const nextQty = Math.min((existing?.qty ?? 0) + qty, product.stock)

      await prisma.cartItem.upsert({
        where:  { userId_productId: { userId, productId } },
        create: { userId, productId, qty: Math.min(qty, product.stock), color },
        update: { qty: nextQty },
      })
    }

    const merged = await prisma.cartItem.findMany({
      where: { userId, product: { isActive: true } },
      orderBy: { createdAt: 'asc' },
      include: cartItemInclude,
    })
    res.json({ success: true, data: merged })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const addSchema = z.object({
  qty:   z.number().int().positive().default(1),
  color: z.string().optional(),
})

/* ── POST /api/cart/:productId — Ajouter (incrémente si présent) ─ */
router.post('/:productId', validateParams(zProductIdParam), validate(addSchema), async (req, res) => {
  try {
    const productId = Number(req.params['productId'])
    const { qty, color } = req.body as z.infer<typeof addSchema>

    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } })
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' })
      return
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: req.user!.userId, productId } },
    })
    const nextQty = Math.min((existing?.qty ?? 0) + qty, product.stock)

    const item = await prisma.cartItem.upsert({
      where:  { userId_productId: { userId: req.user!.userId, productId } },
      create: { userId: req.user!.userId, productId, qty: Math.min(qty, product.stock), color },
      update: { qty: nextQty, ...(color ? { color } : {}) },
      include: cartItemInclude,
    })

    res.status(201).json({ success: true, data: item })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const qtySchema = z.object({ qty: z.number().int().min(0) })

/* ── PUT /api/cart/:productId — Fixer la quantité exacte ─────── */
router.put('/:productId', validateParams(zProductIdParam), validate(qtySchema), async (req, res) => {
  try {
    const productId = Number(req.params['productId'])
    const { qty } = req.body as z.infer<typeof qtySchema>

    if (qty === 0) {
      await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId, productId } })
      res.json({ success: true, message: 'Retiré du panier' })
      return
    }

    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } })
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' })
      return
    }

    const item = await prisma.cartItem.update({
      where: { userId_productId: { userId: req.user!.userId, productId } },
      data:  { qty: Math.min(qty, product.stock) },
      include: cartItemInclude,
    }).catch(() => null)

    if (!item) {
      res.status(404).json({ success: false, message: 'Article absent du panier' })
      return
    }

    res.json({ success: true, data: item })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/cart/:productId — Retirer une ligne ──────────── */
router.delete('/:productId', validateParams(zProductIdParam), async (req, res) => {
  try {
    const productId = Number(req.params['productId'])
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId, productId } })
    res.json({ success: true, message: 'Retiré du panier' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/cart — Vider tout (après commande passée) ────── */
router.delete('/', async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId } })
    res.json({ success: true, message: 'Panier vidé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
