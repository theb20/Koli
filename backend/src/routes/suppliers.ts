/* ─────────────────────────────────────────────────────────────
   Fournisseurs du catalogue Skignas [ADMIN] — /api/admin/suppliers.
   Le mode et le taux ne s'appliquent qu'aux commandes PAYÉES APRÈS leur
   modification : les lignes déjà payées ont figé les leurs
   (OrderItemFinancials). Un fournisseur ayant des produits ou des ventes
   ne se supprime pas (historique) : on le désactive.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zIntIdParam } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { SUPPLIER_MODES } from '../lib/finance/formulas'
import { isPriceSearchConfigured, searchPricesCached } from '../lib/priceSearch'

const router = Router()
router.use(requireAdmin)

const supplierSchema = z.object({
  name:           z.string().trim().min(2).max(120),
  contactName:    z.string().trim().max(120).nullable().optional(),
  phone:          z.string().trim().max(40).nullable().optional(),
  email:          z.string().trim().email().nullable().optional().or(z.literal('')),
  mode:           z.enum(SUPPLIER_MODES).default('MARGIN'),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  isActive:       z.boolean().optional(),
  notes:          z.string().max(2000).nullable().optional(),
})

/** Un fournisseur à la commission doit avoir un taux — sinon ses ventes seraient toutes « coût inconnu ». */
function commissionError(d: { mode?: string; commissionRate?: number | null }): string | null {
  return d.mode === 'COMMISSION' && d.commissionRate == null ? 'Un taux de commission est requis en mode commission' : null
}

const checked = supplierSchema.superRefine((d, ctx) => {
  const err = commissionError(d)
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ['commissionRate'] })
})

const clean = <T extends { email?: string | null }>(d: T) => ({ ...d, email: d.email || null })

/* ── GET /api/admin/suppliers ── */
router.get('/', async (_req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    })
    const missing = await prisma.productSourcing.groupBy({
      by: ['supplierId'], where: { supplierPrice: null, supplierId: { not: null } }, _count: { _all: true },
    })
    res.json({ success: true, data: { suppliers: suppliers.map(({ _count, ...s }) => ({
      ...s,
      productCount: _count.products,
      // Seul le mode MARGIN a besoin d'un prix d'achat
      missingPriceCount: s.mode === 'MARGIN' ? missing.find(m => m.supplierId === s.id)?._count._all ?? 0 : 0,
    })) } })
  } catch (err) {
    logger.error('[suppliers] list', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── POST /api/admin/suppliers ── */
router.post('/', validate(checked), async (req, res) => {
  try {
    const data = clean(req.body as z.infer<typeof supplierSchema>)
    const supplier = await prisma.supplier.create({ data })
    logAdminAction(req, { action: 'supplier.create', targetType: 'Supplier', targetId: String(supplier.id), metadata: { name: data.name, mode: data.mode, commissionRate: data.commissionRate } })
    res.status(201).json({ success: true, data: { supplier } })
  } catch (err) {
    logger.error('[suppliers] create', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ─────────────────────────────────────────────────────────────
   Produits à compléter — catalogue Skignas uniquement (Product.storeId
   null : les boutiques marchandes ont leur commission dans merchantgo).
   Déclarées AVANT /:id, sinon « sourcing » serait pris pour un identifiant.
───────────────────────────────────────────────────────────── */
const SOURCING_FILTERS = ['no_supplier', 'no_price', 'all'] as const
type SourcingFilter = typeof SOURCING_FILTERS[number]

/** Sans fournisseur : aucune fiche d'approvisionnement, ou fournisseur vide. */
const NO_SUPPLIER = { OR: [{ sourcing: { is: null } }, { sourcing: { is: { supplierId: null } } }] }
/** Sans prix d'achat alors qu'il est nécessaire (mode marge, ou pas de fournisseur = marge par défaut). */
const NO_PRICE = {
  OR: [
    { sourcing: { is: null } },
    { sourcing: { is: { supplierPrice: null, OR: [{ supplierId: null }, { supplier: { is: { mode: 'MARGIN' } } }] } } },
  ],
}
const whereFor = (f: SourcingFilter, q?: string) => ({
  storeId: null,
  ...(f === 'no_supplier' ? NO_SUPPLIER : f === 'no_price' ? NO_PRICE : {}),
  ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { brand: { contains: q, mode: 'insensitive' as const } }] } : {}),
})

const sourcingQuery = z.object({
  filter: z.enum(SOURCING_FILTERS).default('no_supplier'),
  q:      z.string().trim().max(100).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
})

/* ── GET /api/admin/suppliers/sourcing?filter=no_supplier|no_price|all&q=&page= ── */
router.get('/sourcing', async (req, res) => {
  const parsed = sourcingQuery.safeParse(req.query)
  if (!parsed.success) { res.status(400).json({ success: false, message: 'Paramètres invalides' }); return }
  const { filter, q, page, limit } = parsed.data
  try {
    // Un filtre de recherche (OR) et un filtre de statut (OR) ne peuvent pas cohabiter dans le même objet
    const where = q ? { AND: [whereFor(filter), whereFor('all', q)] } : whereFor(filter)
    const [total, products, noSupplier, noPrice, catalog] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where, orderBy: [{ isActive: 'desc' }, { sold: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, brand: true, category: true, price: true, isActive: true, sold: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, thumbnailUrl: true } },
          sourcing: { select: { supplierId: true, supplierPrice: true } },
        },
      }),
      prisma.product.count({ where: whereFor('no_supplier') }),
      prisma.product.count({ where: whereFor('no_price') }),
      prisma.product.count({ where: whereFor('all') }),
    ])
    res.json({ success: true, data: {
      counts: { noSupplier, noPrice, catalog },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      products: products.map(({ images, sourcing, ...p }) => ({
        ...p,
        image: images[0]?.thumbnailUrl ?? images[0]?.url ?? null,
        supplierId: sourcing?.supplierId ?? null,
        supplierPrice: sourcing?.supplierPrice ?? null,
      })),
    } })
  } catch (err) {
    logger.error('[suppliers] sourcing list', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/*
 * PUT /api/admin/suppliers/sourcing — correction EN MASSE. Chaque ligne ne
 * modifie que les champs présents : { productId, supplierId? , supplierPrice? }
 * (null = vider). Tout ou rien : une ligne invalide annule le lot.
 * Ne s'applique qu'aux ventes FUTURES (les commandes payées ont figé leurs
 * coûts) — voir lib/finance/snapshot.ts.
 */
const bulkSourcingSchema = z.object({
  items: z.array(z.object({
    productId:     z.number().int().positive(),
    supplierId:    z.number().int().positive().nullable().optional(),
    supplierPrice: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
    /** Nouveau prix de vente du produit (Product.price) — jamais vidé */
    price:         z.number().int().positive().max(1_000_000_000).optional(),
  }).refine(i => i.supplierId !== undefined || i.supplierPrice !== undefined || i.price !== undefined, { message: 'Rien à modifier' })).min(1).max(500),
})

router.put('/sourcing', validate(bulkSourcingSchema), async (req, res) => {
  const { items } = req.body as z.infer<typeof bulkSourcingSchema>
  try {
    const productIds = [...new Set(items.map(i => i.productId))]
    if (productIds.length !== items.length) { res.status(400).json({ success: false, message: 'Un produit apparaît plusieurs fois dans le lot' }); return }
    const supplierIds = [...new Set(items.map(i => i.supplierId).filter((v): v is number => typeof v === 'number'))]
    const [products, suppliers] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, storeId: true } }),
      prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true } }),
    ])
    const missing = productIds.filter(id => !products.some(p => p.id === id))
    if (missing.length) { res.status(400).json({ success: false, message: `Produit(s) introuvable(s) : ${missing.join(', ')}` }); return }
    const merchant = products.filter(p => p.storeId !== null).map(p => p.id)
    if (merchant.length) { res.status(400).json({ success: false, message: `Produit(s) de boutique marchande, non concernés : ${merchant.join(', ')}` }); return }
    const unknownSuppliers = supplierIds.filter(id => !suppliers.some(s => s.id === id))
    if (unknownSuppliers.length) { res.status(400).json({ success: false, message: `Fournisseur(s) introuvable(s) : ${unknownSuppliers.join(', ')}` }); return }

    await prisma.$transaction(items.flatMap(i => {
      const data = {
        ...(i.supplierId !== undefined ? { supplierId: i.supplierId } : {}),
        ...(i.supplierPrice !== undefined ? { supplierPrice: i.supplierPrice } : {}),
      }
      return [
        ...(Object.keys(data).length ? [prisma.productSourcing.upsert({ where: { productId: i.productId }, create: { productId: i.productId, ...data }, update: data })] : []),
        ...(i.price !== undefined ? [prisma.product.update({ where: { id: i.productId }, data: { price: i.price } })] : []),
      ]
    }))
    logAdminAction(req, { action: 'productSourcing.bulkUpdate', targetType: 'Product', targetId: productIds.slice(0, 20).join(','), metadata: { count: items.length, supplierIds, priceChanges: items.filter(i => i.price !== undefined).length } })
    res.json({ success: true, data: { updated: items.length } })
  } catch (err) {
    logger.error('[suppliers] sourcing bulk', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/*
 * POST /api/admin/suppliers/price-search { productId } — prix publics trouvés
 * sur Internet pour un produit du catalogue (cache 24 h, voir lib/priceSearch) ; { refresh: true } force une nouvelle recherche.
 */
const priceSearchSchema = z.object({ productId: z.number().int().positive(), refresh: z.boolean().optional() })

router.post('/price-search', validate(priceSearchSchema), async (req, res) => {
  if (!isPriceSearchConfigured()) { res.status(503).json({ success: false, message: 'Recherche de prix non configurée (SERPAPI_API_KEY manquante)' }); return }
  const { productId, refresh } = req.body as z.infer<typeof priceSearchSchema>
  try {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, brand: true, storeId: true } })
    if (!product || product.storeId !== null) { res.status(404).json({ success: false, message: 'Produit introuvable' }); return }
    const query = [product.brand, product.name].filter(Boolean).join(' ').slice(0, 150)
    const { offers, cached } = await searchPricesCached(query, refresh)
    if (!cached) logAdminAction(req, { action: 'productSourcing.priceSearch', targetType: 'Product', targetId: String(productId) })
    res.json({ success: true, data: { query, offers, cached } })
  } catch (err) {
    logger.error('[suppliers] price search', err)
    res.status(502).json({ success: false, message: 'Le service de recherche de prix est indisponible' })
  }
})

/* ── PUT /api/admin/suppliers/:id ── */
router.put('/:id', validateParams(zIntIdParam), validate(supplierSchema.partial()), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const data = req.body as Partial<z.infer<typeof supplierSchema>>
    const current = await prisma.supplier.findUnique({ where: { id } })
    if (!current) { res.status(404).json({ success: false, message: 'Fournisseur introuvable' }); return }
    const err = commissionError({
      mode:           data.mode ?? current.mode,
      commissionRate: 'commissionRate' in data ? data.commissionRate : current.commissionRate,
    })
    if (err) { res.status(400).json({ success: false, message: err }); return }
    const supplier = await prisma.supplier.update({ where: { id }, data: 'email' in data ? clean(data) : data })
    logAdminAction(req, { action: 'supplier.update', targetType: 'Supplier', targetId: String(id), metadata: data })
    res.json({ success: true, data: { supplier } })
  } catch (err) {
    logger.error('[suppliers] update', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── DELETE /api/admin/suppliers/:id — seulement sans produit ni vente ── */
router.delete('/:id', validateParams(zIntIdParam), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const [products, sales] = await Promise.all([
      prisma.productSourcing.count({ where: { supplierId: id } }),
      prisma.orderItemFinancials.count({ where: { supplierId: id } }),
    ])
    if (products + sales > 0) {
      res.status(409).json({ success: false, message: 'Ce fournisseur a des produits ou des ventes : désactivez-le plutôt que de le supprimer.' })
      return
    }
    await prisma.supplier.delete({ where: { id } })
    logAdminAction(req, { action: 'supplier.delete', targetType: 'Supplier', targetId: String(id) })
    res.json({ success: true })
  } catch (err) {
    logger.error('[suppliers] delete', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
