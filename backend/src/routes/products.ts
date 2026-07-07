import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { cacheControl } from '../middleware/cache'

const router = Router()

/* ── Schemas ─────────────────────────────────────────────────── */

const listQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(500).default(20),
  category: z.string().optional(),
  q:        z.string().optional(),
  sort:     z.enum(['popular', 'newest', 'price_asc', 'price_desc', 'rating']).default('popular'),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  badge:    z.string().optional(),
  inStock:  z.coerce.boolean().optional(),
  storeId:  z.coerce.number().int().optional(),   // filter by store
  hasSale:  z.coerce.boolean().optional(),        // filter: promo programmée (salePrice défini)
})

const createProductSchema = z.object({
  name:        z.string().min(3).max(200),
  brand:       z.string().min(1).max(100),
  category:    z.string().min(1, 'Catégorie requise'),
  price:       z.number().int().positive(),
  oldPrice:    z.number().int().positive().optional(),
  badge:       z.enum(['hot', 'new', 'sale', 'top']).optional(),
  stock:       z.number().int().nonnegative().default(100),
  isNew:       z.boolean().default(false),
  description: z.string().optional(),
  colors:      z.array(z.string()).optional(),
  images:      z.array(z.string().url()).min(1).max(4),
  specs:       z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  /* Promo programmée (Deals du jour / vente flash) */
  salePrice:    z.number().int().positive().nullable().optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt:   z.coerce.date().nullable().optional(),
})

/** Cohérence de la promo — appliquée à la création ET à l'édition */
function saleWindowError(d: { salePrice?: number | null; saleStartsAt?: Date | null; saleEndsAt?: Date | null }): string | null {
  if (d.salePrice != null && !d.saleEndsAt) return 'Une date de fin est requise pour programmer un prix promo'
  if (d.saleStartsAt && d.saleEndsAt && d.saleStartsAt >= d.saleEndsAt) return 'La date de fin doit être après la date de début'
  return null
}

const createProductSchemaChecked = createProductSchema.superRefine((d, ctx) => {
  const err = saleWindowError(d)
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ['saleEndsAt'] })
})

/* ─────────────────────────────────────────────────────────────
   GET /api/products
───────────────────────────────────────────────────────────── */
router.get('/', optionalAuth, cacheControl(30), async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query)
    const { page, limit, category, q, sort, minPrice, maxPrice, badge, inStock, storeId, hasSale } = query

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true }
    if (category) where['category'] = category
    if (badge)    where['badge']    = badge
    if (inStock)  where['stock']    = { gt: 0 }
    if (storeId)  where['storeId']  = storeId
    if (hasSale)  where['salePrice'] = { not: null }
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
          images:      { orderBy: { position: 'asc' } },
          store:       { select: { id: true, name: true } },
          categoryRel: { select: { id: true, slug: true, name: true, icon: true, image: true } },
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
router.get('/featured', cacheControl(60), async (_req, res) => {
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
router.get('/:id', optionalAuth, cacheControl(20), async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '')
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID invalide' })
      return
    }

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        images:      { orderBy: { position: 'asc' } },
        specs:       { orderBy: { position: 'asc' } },
        categoryRel: { select: { id: true, slug: true, name: true, icon: true, image: true } },
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
   POST /api/products/bulk-sale  [ADMIN]
   Programme (ou retire) la même promo sur plusieurs produits d'un coup.
───────────────────────────────────────────────────────────── */
const bulkSaleSchema = z.object({
  productIds:   z.array(z.number().int().positive()).min(1),
  salePrice:    z.number().int().positive().nullable(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt:   z.coerce.date().nullable().optional(),
})

router.post('/bulk-sale', requireAdmin, validate(bulkSaleSchema), async (req, res) => {
  try {
    const { productIds, salePrice, saleStartsAt, saleEndsAt } = req.body as z.infer<typeof bulkSaleSchema>

    if (salePrice !== null) {
      const err = saleWindowError({ salePrice, saleStartsAt: saleStartsAt ?? null, saleEndsAt: saleEndsAt ?? null })
      if (err) {
        res.status(400).json({ success: false, message: err })
        return
      }
    }

    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: {
        salePrice,
        saleStartsAt: salePrice === null ? null : (saleStartsAt ?? null),
        saleEndsAt:   salePrice === null ? null : (saleEndsAt ?? null),
      },
    })

    res.json({ success: true, data: { updated: productIds.length } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /api/products  [ADMIN]
───────────────────────────────────────────────────────────── */
router.post('/', requireAdmin, validate(createProductSchemaChecked), async (req, res) => {
  try {
    const { images, specs, colors, ...data } = req.body as z.infer<typeof createProductSchema>

    // Résoudre categoryId depuis le slug
    const catRow = await prisma.category.findUnique({ where: { slug: data.category } })
    if (!catRow) {
      res.status(400).json({ success: false, message: `Catégorie "${data.category}" introuvable` })
      return
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        categoryId: catRow.id,
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
router.put('/:id', requireAdmin, validate(createProductSchema.partial()), async (req, res) => {
  try {
    const id = parseInt(req.params['id'] ?? '')
    const { images, specs, colors, ...data } = req.body as Partial<z.infer<typeof createProductSchema>>

    // Résoudre categoryId si le slug est fourni
    const catRow = data.category ? await prisma.category.findUnique({ where: { slug: data.category } }) : undefined
    if (data.category && !catRow) {
      res.status(400).json({ success: false, message: `Catégorie "${data.category}" introuvable` })
      return
    }

    // Vérifie la cohérence de la promo en fusionnant avec l'état actuel (mise à jour partielle)
    if ('salePrice' in data || 'saleStartsAt' in data || 'saleEndsAt' in data) {
      const current = await prisma.product.findUnique({
        where: { id }, select: { salePrice: true, saleStartsAt: true, saleEndsAt: true },
      })
      const merged = {
        salePrice:    'salePrice'    in data ? data.salePrice    : current?.salePrice,
        saleStartsAt: 'saleStartsAt' in data ? data.saleStartsAt : current?.saleStartsAt,
        saleEndsAt:   'saleEndsAt'   in data ? data.saleEndsAt   : current?.saleEndsAt,
      }
      const err = saleWindowError(merged)
      if (err) {
        res.status(400).json({ success: false, message: err })
        return
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(catRow !== undefined ? { categoryId: catRow?.id ?? null } : {}),
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
