import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

/* ── Schemas ─────────────────────────────────────────────────── */

const listQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  q:        z.string().optional(),        // recherche texte
  sort:     z.enum(['popular', 'newest', 'price_asc', 'price_desc', 'rating']).default('popular'),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  badge:    z.string().optional(),
  inStock:  z.coerce.boolean().optional(),
})

const createProductSchema = z.object({
  name:        z.string().min(3).max(200),
  brand:       z.string().min(1).max(100),
  category:    z.enum(['hightech', 'maison', 'beaute', 'sport', 'mode', 'jeux']),
  price:       z.number().int().positive(),
  oldPrice:    z.number().int().positive().optional(),
  badge:       z.enum(['hot', 'new', 'sale', 'top']).optional(),
  stock:       z.number().int().nonnegative().default(100),
  isNew:       z.boolean().default(false),
  description: z.string().optional(),
  colors:      z.array(z.string()).optional(),
  images:      z.array(z.string().url()).min(1).max(4),
  specs:       z.array(z.object({ label: z.string(), value: z.string() })).optional(),
})

/* ─────────────────────────────────────────────────────────────
   GET /api/products
───────────────────────────────────────────────────────────── */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query)
    const { page, limit, category, q, sort, minPrice, maxPrice, badge, inStock } = query

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true }
    if (category) where['category'] = category
    if (badge)    where['badge']    = badge
    if (inStock)  where['stock']    = { gt: 0 }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where['price'] = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    }
    if (q) {
      where['OR'] = [
        { name:  { contains: q } },
        { brand: { contains: q } },
        { description: { contains: q } },
      ]
    }

    const orderBy = (() => {
      switch (sort) {
        case 'newest':     return { createdAt: 'desc' as const }
        case 'price_asc':  return { price: 'asc' as const }
        case 'price_desc': return { price: 'desc' as const }
        case 'rating':     return { rating: 'desc' as const }
        default:           return { sold: 'desc' as const }
      }
    })()

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          images: { orderBy: { position: 'asc' } },
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Paramètres invalides', errors: err.flatten().fieldErrors })
      return
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/products/featured   — produits mis en avant (homepage)
───────────────────────────────────────────────────────────── */
router.get('/featured', async (_req, res) => {
  try {
    const [hot, newItems, topRated] = await Promise.all([
      prisma.product.findMany({
        where: { badge: 'hot', isActive: true },
        take: 8, orderBy: { sold: 'desc' },
        include: { images: { take: 1, orderBy: { position: 'asc' } } },
      }),
      prisma.product.findMany({
        where: { isNew: true, isActive: true },
        take: 8, orderBy: { createdAt: 'desc' },
        include: { images: { take: 1, orderBy: { position: 'asc' } } },
      }),
      prisma.product.findMany({
        where: { rating: { gte: 4.5 }, isActive: true },
        take: 8, orderBy: { rating: 'desc' },
        include: { images: { take: 1, orderBy: { position: 'asc' } } },
      }),
    ])
    res.json({ success: true, data: { hot, new: newItems, topRated } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/products/:id
───────────────────────────────────────────────────────────── */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '')
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID invalide' })
      return
    }

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' } },
        specs:  { orderBy: { position: 'asc' } },
        reviewItems: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { prenom: true, nom: true, avatar: true } } },
        },
      },
    })

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' })
      return
    }

    // Produits similaires
    const similar = await prisma.product.findMany({
      where: { category: product.category, id: { not: product.id }, isActive: true },
      take: 6, orderBy: { sold: 'desc' },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    })

    // Vérifier si dans la wishlist
    let inWishlist = false
    if (req.user) {
      const wish = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: req.user.userId, productId: id } },
      })
      inWishlist = !!wish
    }

    res.json({ success: true, data: { product, similar, inWishlist } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/products  [ADMIN]
───────────────────────────────────────────────────────────── */
router.post('/', requireAdmin, validate(createProductSchema), async (req, res) => {
  try {
    const { images, specs, colors, ...data } = req.body as z.infer<typeof createProductSchema>

    const product = await prisma.product.create({
      data: {
        ...data,
        colors: colors ? JSON.stringify(colors) : null,
        images: {
          create: images.map((url, i) => ({ url, position: i })),
        },
        specs: specs ? {
          create: specs.map((s, i) => ({ ...s, position: i })),
        } : undefined,
      },
      include: {
        images: true,
        specs: true,
      },
    })

    res.status(201).json({ success: true, data: product })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/products/:id  [ADMIN]
───────────────────────────────────────────────────────────── */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '')
    const { images, specs, colors, ...data } = req.body as Partial<z.infer<typeof createProductSchema>>

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(colors !== undefined ? { colors: JSON.stringify(colors) } : {}),
        ...(images ? {
          images: {
            deleteMany: {},
            create: images.map((url, i) => ({ url, position: i })),
          },
        } : {}),
        ...(specs ? {
          specs: {
            deleteMany: {},
            create: specs.map((s, i) => ({ ...s, position: i })),
          },
        } : {}),
      },
      include: { images: true, specs: true },
    })

    res.json({ success: true, data: product })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   DELETE /api/products/:id  [ADMIN]  (soft delete)
───────────────────────────────────────────────────────────── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '')
    await prisma.product.update({ where: { id }, data: { isActive: false } })
    res.json({ success: true, message: 'Produit désactivé' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
