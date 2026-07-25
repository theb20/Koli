import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireSeller } from '../middleware/auth'
import { logger } from '../lib/logger'
import { toWebp, toWebpThumbnail } from '../lib/imageProcessing'
import { scanBuffer } from '../lib/virusScan'
import { uploadToStockgo } from '../lib/stockgo'
import { rehostImages } from '../lib/rehostImage'
import { getBackendUrl } from '../lib/backendUrl'
import { parseSpreadsheet } from '../lib/spreadsheet'
import { deleteProductAtomic } from '../lib/productDeletion'
import type { Prisma, Order, OrderItem } from '@prisma/client'

const router = Router()

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Seuls les fichiers image (jpg, png, webp, heic, avif) sont acceptés'))
  },
})

/** Cf. merchant-onboarding.ts — évite qu'une erreur multer ressorte en 500 générique */
function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  productImageUpload.single('file')(req, res, (err: unknown) => {
    if (!err) { next(); return }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Fichier trop volumineux (8 Mo maximum)' })
      return
    }
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Fichier invalide' })
  })
}

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo — largement suffisant pour un tableur de produits
  fileFilter: (_req, file, cb) => {
    if (/\.(csv|xlsx)$/i.test(file.originalname)) cb(null, true)
    else cb(new Error('Seuls les fichiers CSV ou Excel (.xlsx) sont acceptés'))
  },
})

/*
 * Import massif — même flux en 2 temps que /api/products/bulk-import (admin) :
 * preview (parse + valide, n'écrit rien) puis commit (crée réellement les
 * lignes validées). Contrairement à la version admin, brand est optionnel
 * (retombe sur le nom de la boutique, comme la création à l'unité) et
 * storeId n'est jamais fourni par le client — toujours celle du marchand
 * authentifié, pour qu'un marchand ne puisse importer que dans sa propre
 * boutique.
 */
const bulkImportRowSchema = z.object({
  name:        z.string().min(3, 'Nom trop court').max(200),
  brand:       z.string().max(100).optional(),
  category:    z.string().min(1, 'Catégorie requise'),
  price:       z.coerce.number().int('Prix invalide').positive('Prix invalide'),
  oldPrice:    z.coerce.number().int().positive().optional().or(z.literal('')),
  stock:       z.coerce.number().int().nonnegative().optional(),
  description: z.string().optional(),
  images:      z.string().optional(),
})

type BulkImportRow = {
  name: string
  brand?: string
  category: string
  price: number
  oldPrice?: number
  stock: number
  description?: string
  images: string[]
}

function validateSellerBulkImportRows(records: Record<string, string>[], categorySlugSet: Set<string>) {
  const valid: { row: number; data: BulkImportRow }[] = []
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2 // +1 header, +1 index→1-based
    const parsed = bulkImportRowSchema.safeParse(records[i])
    if (!parsed.success) {
      skipped.push({ row: rowNum, reason: parsed.error.issues.map(e => e.message).join(', ') })
      continue
    }
    const d = parsed.data

    if (!categorySlugSet.has(d.category)) {
      skipped.push({ row: rowNum, reason: `Catégorie "${d.category}" introuvable` })
      continue
    }

    const imageUrls = (d.images ?? '').split(/[|,]/).map(s => s.trim()).filter(Boolean).slice(0, 4)
    if (imageUrls.length === 0) {
      skipped.push({ row: rowNum, reason: 'Au moins une image requise' })
      continue
    }
    const invalidUrl = imageUrls.find(u => !z.string().url().safeParse(u).success)
    if (invalidUrl) {
      skipped.push({ row: rowNum, reason: `URL image invalide : ${invalidUrl}` })
      continue
    }

    valid.push({
      row: rowNum,
      data: {
        name: d.name,
        brand: d.brand || undefined,
        category: d.category,
        price: d.price,
        oldPrice: d.oldPrice || undefined,
        stock: d.stock ?? 100,
        description: d.description || undefined,
        images: imageUrls,
      },
    })
  }

  return { valid, skipped, total: records.length }
}

/* POST /api/seller/products/bulk-import/preview — parse + valide, n'écrit rien */
router.post('/products/bulk-import/preview', requireSeller, csvUpload.single('file'), async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }
    if (!store.isApproved) { res.status(403).json({ success: false, message: 'Boutique en attente de validation.' }); return }

    if (!req.file) { res.status(400).json({ success: false, message: 'Aucun fichier reçu' }); return }

    const scan = await scanBuffer(req.file.buffer, req.file.originalname)
    if (!scan.clean) {
      res.status(400).json({ success: false, message: `Fichier refusé — contenu malveillant détecté (${scan.reason})` })
      return
    }

    const isXlsx = /\.xlsx$/i.test(req.file.originalname)
    let records: Record<string, string>[]
    try {
      records = await parseSpreadsheet(req.file.buffer, isXlsx)
    } catch {
      res.status(400).json({ success: false, message: 'Fichier invalide ou mal formaté' })
      return
    }
    if (records.length === 0) { res.status(400).json({ success: false, message: 'Le fichier est vide' }); return }
    if (records.length > 200) { res.status(400).json({ success: false, message: 'Maximum 200 lignes par import' }); return }

    const categories = await prisma.category.findMany({ select: { slug: true } })
    const categorySlugSet = new Set(categories.map(c => c.slug))
    const result = validateSellerBulkImportRows(records, categorySlugSet)

    res.json({ success: true, data: result })
  } catch (err) {
    logger.error('[seller/bulk-import preview]', err)
    res.status(500).json({ success: false, message: "Erreur lors de l'analyse du fichier" })
  }
})

/* GET /api/seller/products/bulk-import/template — modèle Excel prêt à l'emploi */
router.get('/products/bulk-import/template', requireSeller, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ select: { slug: true }, orderBy: { position: 'asc' } })
    const categorySlugs = categories.map(c => c.slug)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Skignas'
    wb.created = new Date()

    const ws = wb.addWorksheet('Produits')
    const columns: { header: string; key: keyof BulkImportRow | 'images'; width: number }[] = [
      { header: 'name',        key: 'name',        width: 32 },
      { header: 'brand',       key: 'brand',        width: 18 },
      { header: 'category',    key: 'category',     width: 16 },
      { header: 'price',       key: 'price',        width: 12 },
      { header: 'oldPrice',    key: 'oldPrice',     width: 12 },
      { header: 'stock',       key: 'stock',        width: 10 },
      { header: 'description', key: 'description', width: 40 },
      { header: 'images',      key: 'images',       width: 60 },
    ]
    ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }))

    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }
    headerRow.alignment = { vertical: 'middle' }
    headerRow.height = 20

    ws.addRow({
      name: 'Manette Pro X', brand: 'GameX', category: categorySlugs[0] ?? 'gaming',
      price: 15000, oldPrice: 20000, stock: 30,
      description: 'Manette sans fil haute précision, autonomie 20h',
      images: 'https://exemple.com/image1.jpg|https://exemple.com/image2.jpg',
    })
    ws.addRow({
      name: 'Casque Gamer', brand: 'SoundMax', category: categorySlugs[0] ?? 'gaming',
      price: 25000, oldPrice: '', stock: 15,
      description: 'Casque avec micro rétractable',
      images: 'https://exemple.com/image3.jpg',
    })
    ws.getRow(2).font = { italic: true, color: { argb: 'FF94A3B8' } }
    ws.getRow(3).font = { italic: true, color: { argb: 'FF94A3B8' } }

    const LAST_ROW = 201
    for (let r = 2; r <= LAST_ROW; r++) {
      if (categorySlugs.length > 0) {
        ws.getCell(`C${r}`).dataValidation = {
          type: 'list', allowBlank: false,
          formulae: [`"${categorySlugs.join(',')}"`],
          showErrorMessage: true, errorTitle: 'Catégorie invalide',
          error: 'Choisissez une catégorie existante dans la liste.',
        }
      }
    }

    const notes = wb.addWorksheet('Instructions')
    notes.columns = [{ header: 'Colonne', key: 'col', width: 16 }, { header: 'Explication', key: 'desc', width: 80 }]
    notes.getRow(1).font = { bold: true }
    notes.addRows([
      { col: 'name', desc: 'Nom du produit (min. 3 caractères)' },
      { col: 'brand', desc: 'Marque du produit (optionnel — reprend le nom de votre boutique si vide)' },
      { col: 'category', desc: `Slug d'une catégorie existante : ${categorySlugs.join(', ') || '(aucune catégorie créée)'}` },
      { col: 'price', desc: 'Prix de vente en FCFA, nombre entier positif' },
      { col: 'oldPrice', desc: 'Ancien prix barré (optionnel)' },
      { col: 'stock', desc: 'Quantité en stock (par défaut 100 si vide)' },
      { col: 'description', desc: 'Description du produit (optionnel)' },
      { col: 'images', desc: "Une ou plusieurs URLs d'image séparées par | (jusqu'à 4). Les images sont automatiquement retéléchargées et réhébergées côté serveur." },
    ])

    const buffer = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="modele-import-produits.xlsx"')
    res.send(Buffer.from(buffer))
  } catch (err) {
    logger.error('[seller/bulk-import template]', err)
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du modèle' })
  }
})

const bulkImportCommitSchema = z.object({
  rows: z.array(z.object({
    name:        z.string().min(3).max(200),
    brand:       z.string().max(100).optional(),
    category:    z.string().min(1),
    price:       z.number().int().positive(),
    oldPrice:    z.number().int().positive().optional(),
    stock:       z.number().int().nonnegative(),
    description: z.string().optional(),
    images:      z.array(z.string().url()).min(1).max(4),
  })).min(1).max(200),
})

/* POST /api/seller/products/bulk-import/commit — crée réellement les lignes validées */
router.post('/products/bulk-import/commit', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }
    if (!store.isApproved) { res.status(403).json({ success: false, message: 'Boutique en attente de validation.' }); return }

    const { rows } = bulkImportCommitSchema.parse(req.body)

    const categories = await prisma.category.findMany({ select: { id: true, slug: true } })
    const categoryIdBySlug = new Map(categories.map(c => [c.slug, c.id]))
    const BASE_URL = getBackendUrl()

    let created = 0
    const skipped: { row: number; reason: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const d = rows[i]
      const categoryId = categoryIdBySlug.get(d.category)
      if (!categoryId) {
        skipped.push({ row: i + 1, reason: `Catégorie "${d.category}" introuvable` })
        continue
      }

      const rehostedImages = await rehostImages(d.images, BASE_URL)

      await prisma.product.create({
        data: {
          name:        d.name,
          brand:       d.brand || store.name,
          category:    d.category,
          categoryId,
          storeId:     store.id,
          price:       d.price,
          oldPrice:    d.oldPrice,
          stock:       d.stock,
          description: d.description,
          isActive:    true,
          images: { create: rehostedImages.map((img, idx) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl, position: idx })) },
        },
      })
      created++
    }

    res.json({ success: true, data: { created, skipped, total: rows.length } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.issues[0]?.message ?? 'Requête invalide' }); return }
    logger.error('[seller/bulk-import commit]', err)
    res.status(500).json({ success: false, message: "Erreur lors de l'import" })
  }
})

/*
 * ─────────────────────────────────────────────────────────────────────
 * Backoffice marchand (koli-marchand) — dashboard, produits, commandes,
 * clients, statistiques.
 *
 * Modèle de propriété : Product.storeId, PAS SellerProduct (qui sert au
 * système de dropship/commission préexistant utilisé ailleurs — laissé
 * intact). Ici, chaque produit créé depuis koli-marchand appartient
 * directement à la boutique du marchand, sans commission séparée.
 *
 * "Ventes comptabilisées" = commandes dont le statut n'est ni 'pending'
 * ni 'cancelled' ni 'refunded' — une commande simplement créée mais
 * jamais confirmée par le client ne doit pas gonfler le chiffre
 * d'affaires affiché.
 * ─────────────────────────────────────────────────────────────────────
 */
const COUNTED_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered']

async function requireMyStore(userId: string) {
  return prisma.sellerStore.findUnique({ where: { userId } })
}

function productStatus(p: { isActive: boolean; stock: number }): 'online' | 'draft' | 'out_of_stock' {
  if (!p.isActive) return 'draft'
  if (p.stock <= 0) return 'out_of_stock'
  return 'online'
}

function productSku(id: number): string {
  return `SKG-${String(id).padStart(5, '0')}`
}

type ProductWithImages = Prisma.ProductGetPayload<{ include: { images: true } }>

function shapeProduct(p: ProductWithImages, revenue = 0) {
  return {
    id:              String(p.id),
    sku:             productSku(p.id),
    name:            p.name,
    brand:           p.brand,
    category:        p.category,
    price:           p.price,
    compareAtPrice:  p.oldPrice ?? undefined,
    stock:           p.stock,
    status:          productStatus(p),
    description:     p.description ?? '',
    images:          p.images.sort((a, b) => a.position - b.position).map(i => ({ url: i.url, thumbnailUrl: i.thumbnailUrl ?? undefined })),
    soldCount:       p.sold,
    revenue,
    createdAt:       p.createdAt.toISOString(),
    updatedAt:       p.updatedAt.toISOString(),
  }
}

/** Items de commande dont le produit appartient à cette boutique. */
async function storeOrderItems(storeId: number, opts: { since?: Date; statuses?: string[] } = {}) {
  return prisma.orderItem.findMany({
    where: {
      product: { storeId },
      order: {
        ...(opts.since ? { createdAt: { gte: opts.since } } : {}),
        ...(opts.statuses ? { status: { in: opts.statuses } } : {}),
      },
    },
    include: { order: true },
  })
}

function shapeOrder(order: Order, items: OrderItem[]) {
  const itemsCount = items.reduce((s, i) => s + i.qty, 0)
  const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0)
  return {
    id:          order.id,
    orderNumber: order.orderNumber,
    customer: {
      id:    order.userId ?? `guest-${order.id}`,
      name:  `${order.clientPrenom} ${order.clientNom}`.trim(),
      phone: order.clientTelephone,
      email: order.clientEmail,
    },
    items: items.map(i => ({
      id:          String(i.id),
      productId:   String(i.productId),
      productName: i.name,
      thumbnail:   i.image,
      quantity:    i.qty,
      unitPrice:   i.price,
      totalPrice:  i.price * i.qty,
    })),
    itemsCount,
    totalAmount,
    paymentMethod:    order.paymentMethod,
    status:           order.status,
    shippingAddress: { address: order.shippingAddress, city: '', country: '' },
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

/* GET /api/seller/me — infos de ma boutique */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const store = await prisma.sellerStore.findUnique({
      where:   { userId: req.user!.userId },
      include: {
        products: {
          include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
        },
      },
    })
    res.json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/seller/register — créer ma boutique */
router.post('/register', requireAuth, async (req, res) => {
  try {
    const body = z.object({
      name:        z.string().min(2).max(80),
      description: z.string().max(500).optional(),
      phone:       z.string().optional(),
      address:     z.string().optional(),
    }).parse(req.body)

    const existing = await prisma.sellerStore.findUnique({ where: { userId: req.user!.userId } })
    if (existing) {
      res.status(409).json({ success: false, message: 'Vous avez déjà une boutique.' })
      return
    }

    const store = await prisma.sellerStore.create({
      data: { userId: req.user!.userId, ...body },
    })
    // Passer le rôle en "seller"
    await prisma.user.update({
      where: { id: req.user!.userId },
      data:  { role: 'seller' },
    })
    res.status(201).json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* PATCH /api/seller/me — mettre à jour ma boutique */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const body = z.object({
      name:        z.string().min(2).max(80).optional(),
      description: z.string().max(500).optional(),
      logo:        z.string().optional(),
      banner:      z.string().optional(),
      phone:       z.string().optional(),
      address:     z.string().optional(),
    }).parse(req.body)

    const store = await prisma.sellerStore.update({
      where: { userId: req.user!.userId },
      data:  body,
    })
    res.json({ success: true, data: { store } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/seller/stats — revenus + commandes */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const store = await prisma.sellerStore.findUnique({ where: { userId: req.user!.userId } })
    if (!store) {
      res.status(404).json({ success: false, message: 'Boutique introuvable.' })
      return
    }
    const sellerProducts = await prisma.sellerProduct.findMany({
      where:  { storeId: store.id },
      select: { productId: true, commission: true },
    })
    const productIds = sellerProducts.map(p => p.productId)

    const orderItems = await prisma.orderItem.findMany({
      where:   { productId: { in: productIds } },
      include: { order: { select: { status: true, createdAt: true } } },
    })

    const revenue = Math.round(orderItems
      .filter(i => i.order.status === 'delivered')
      .reduce((s, i) => {
        const sp = sellerProducts.find(p => p.productId === i.productId)
        const commission = sp?.commission ?? 5
        return s + i.price * i.qty * (1 - commission / 100)
      }, 0))

    const totalOrders = new Set(orderItems.map(i => i.orderId)).size

    res.json({
      success: true,
      data: {
        revenue,
        totalOrders,
        totalProducts: productIds.length,
        isApproved: store.isApproved,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Dashboard ────────────────────────────────────────────────────── */
router.get('/dashboard', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const now = new Date()
    const period30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const period60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const [recentItems, previousItems, allCountedItems] = await Promise.all([
      storeOrderItems(store.id, { since: period30, statuses: COUNTED_STATUSES }),
      storeOrderItems(store.id, { since: period60, statuses: COUNTED_STATUSES }),
      storeOrderItems(store.id, { statuses: COUNTED_STATUSES }),
    ])
    const olderItems = previousItems.filter(i => i.order.createdAt < period30)

    const sum = (items: typeof recentItems) => items.reduce((s, i) => s + i.price * i.qty, 0)
    const orderCount = (items: typeof recentItems) => new Set(items.map(i => i.orderId)).size

    const revenue = sum(recentItems)
    const prevRevenue = sum(olderItems)
    const orders = orderCount(recentItems)
    const prevOrders = orderCount(olderItems)
    const pctChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

    const kpis = [
      { key: 'revenue', label: 'Chiffre d\'affaires (30j)', value: `${revenue.toLocaleString('fr-FR')} F`, rawValue: revenue, change: pctChange(revenue, prevRevenue) },
      { key: 'orders', label: 'Commandes (30j)', value: String(orders), rawValue: orders, change: pctChange(orders, prevOrders) },
      { key: 'averageBasket', label: 'Panier moyen', value: `${orders ? Math.round(revenue / orders).toLocaleString('fr-FR') : 0} F`, rawValue: orders ? Math.round(revenue / orders) : 0, change: 0 },
      { key: 'conversionRate', label: 'Taux de conversion', value: '—', rawValue: 0, change: 0 },
    ]

    const days: { date: string; label: string; amount: number; isToday: boolean }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      const dayKey = day.toISOString().slice(0, 10)
      const amount = recentItems
        .filter(it => it.order.createdAt.toISOString().slice(0, 10) === dayKey)
        .reduce((s, it) => s + it.price * it.qty, 0)
      days.push({
        date: dayKey,
        label: day.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        amount,
        isToday: i === 0,
      })
    }

    const byProduct = new Map<number, { name: string; thumbnail: string; soldCount: number; revenue: number }>()
    for (const it of allCountedItems) {
      const curr = byProduct.get(it.productId) ?? { name: it.name, thumbnail: it.image, soldCount: 0, revenue: 0 }
      curr.soldCount += it.qty
      curr.revenue += it.price * it.qty
      byProduct.set(it.productId, curr)
    }
    const bestSellers = [...byProduct.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([productId, v]) => ({ productId: String(productId), ...v }))

    const recentOrderIds = [...new Set(recentItems.map(i => i.orderId))]
      .sort((a, b) => {
        const oa = recentItems.find(i => i.orderId === a)!.order.createdAt.getTime()
        const ob = recentItems.find(i => i.orderId === b)!.order.createdAt.getTime()
        return ob - oa
      })
      .slice(0, 5)
    const recentOrders = recentOrderIds.map(id => {
      const items = recentItems.filter(i => i.orderId === id)
      return shapeOrder(items[0].order, items)
    })

    res.json({ success: true, data: { kpis, revenueByDay: days, bestSellers, recentOrders } })
  } catch (err) {
    logger.error('[seller/dashboard]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Produits ─────────────────────────────────────────────────────── */
router.get('/products', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const status   = String(req.query.status ?? 'all')
    const search   = req.query.search ? String(req.query.search) : undefined
    const page     = Math.max(1, Number(req.query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)))

    const where: Prisma.ProductWhereInput = { storeId: store.id }
    if (status === 'draft') where.isActive = false
    if (status === 'online') { where.isActive = true; where.stock = { gt: 0 } }
    if (status === 'out_of_stock') { where.isActive = true; where.stock = { lte: 0 } }
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where, include: { images: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
    ])

    // pas de _sum direct utilisable : _sum.price serait le prix unitaire
    // (pas le sous-total), recalcul exact ligne à ligne
    const items = await prisma.orderItem.findMany({
      where: { productId: { in: products.map(p => p.id) }, order: { status: { in: COUNTED_STATUSES } } },
      select: { productId: true, price: true, qty: true },
    })
    const revenueMap = new Map<number, number>()
    for (const it of items) revenueMap.set(it.productId, (revenueMap.get(it.productId) ?? 0) + it.price * it.qty)

    res.json({ success: true, data: { items: products.map(p => shapeProduct(p, revenueMap.get(p.id) ?? 0)), total, page, pageSize } })
  } catch (err) {
    logger.error('[seller/products list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

const productInputSchema = z.object({
  name:            z.string().min(2).max(150),
  brand:           z.string().max(80).optional(),
  category:        z.string().min(1).max(80),
  price:           z.number().int().positive(),
  compareAtPrice:  z.number().int().positive().optional(),
  stock:           z.number().int().min(0),
  status:          z.enum(['online', 'draft', 'out_of_stock']).optional(),
  description:     z.string().max(5000).optional(),
  images:          z.array(z.object({ url: z.string().url(), thumbnailUrl: z.string().url().optional() })).max(10).optional(),
})

/* POST /api/seller/products/upload-image — un fichier à la fois, renvoie
   {url, thumbnailUrl} (même pipeline que rehostImage.ts pour les images
   externes : conversion WebP + vignette 480px pour la grille produits). */
router.post('/products/upload-image', requireSeller, handleImageUpload, async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: "Champ 'file' manquant" }); return }

    const scan = await scanBuffer(req.file.buffer, req.file.originalname)
    if (!scan.clean) {
      logger.error('[seller/upload-image] fichier rejeté (antivirus)', req.user!.userId, scan.reason)
      res.status(400).json({ success: false, message: 'Fichier rejeté par le scan antivirus' })
      return
    }

    const [webp, thumb] = await Promise.all([toWebp(req.file.buffer), toWebpThumbnail(req.file.buffer)])
    const rand = Math.random().toString(36).slice(2)
    const [url, thumbnailUrl] = await Promise.all([
      uploadToStockgo(webp, `prod-${Date.now()}-${rand}.webp`, 'image/webp', 'products'),
      uploadToStockgo(thumb, `prod-${Date.now()}-${rand}-thumb.webp`, 'image/webp', 'products'),
    ])

    res.status(201).json({ success: true, data: { url, thumbnailUrl } })
  } catch (err) {
    logger.error('[seller/upload-image] échec', err)
    res.status(500).json({ success: false, message: "Échec de l'upload" })
  }
})

router.post('/products', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }
    if (!store.isApproved) { res.status(403).json({ success: false, message: 'Boutique en attente de validation.' }); return }

    const body = productInputSchema.parse(req.body)
    const cat = await prisma.category.findUnique({ where: { slug: body.category } })
    if (!cat) { res.status(400).json({ success: false, message: `Catégorie "${body.category}" introuvable` }); return }

    const product = await prisma.product.create({
      data: {
        name: body.name, category: cat.slug, categoryId: cat.id, brand: body.brand || store.name,
        price: body.price, oldPrice: body.compareAtPrice, stock: body.stock,
        isActive: body.status !== 'draft', description: body.description,
        storeId: store.id,
        images: body.images ? { create: body.images.map((img, position) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl, position })) } : undefined,
      },
      include: { images: true },
    })
    res.status(201).json({ success: true, data: shapeProduct(product) })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.issues[0]?.message ?? 'Requête invalide' }); return }
    logger.error('[seller/products create]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

router.patch('/products/:id', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }
    if (!store.isApproved) { res.status(403).json({ success: false, message: 'Boutique en attente de validation.' }); return }

    const id = Number(req.params.id)
    const existing = await prisma.product.findFirst({ where: { id, storeId: store.id } })
    if (!existing) { res.status(404).json({ success: false, message: 'Produit introuvable.' }); return }

    const body = productInputSchema.partial().parse(req.body)
    let cat: { id: number; slug: string } | null = null
    if (body.category) {
      cat = await prisma.category.findUnique({ where: { slug: body.category }, select: { id: true, slug: true } })
      if (!cat) { res.status(400).json({ success: false, message: `Catégorie "${body.category}" introuvable` }); return }
    }
    if (body.images) {
      await prisma.productImage.deleteMany({ where: { productId: id } })
    }
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name, brand: body.brand, category: cat?.slug, categoryId: cat?.id, price: body.price,
        oldPrice: body.compareAtPrice, stock: body.stock,
        isActive: body.status ? body.status !== 'draft' : undefined,
        description: body.description,
        images: body.images ? { create: body.images.map((img, position) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl, position })) } : undefined,
      },
      include: { images: true },
    })
    res.json({ success: true, data: shapeProduct(product) })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.issues[0]?.message ?? 'Requête invalide' }); return }
    logger.error('[seller/products update]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/*
 * Suppression définitive si le produit n'a jamais été commandé (cascade +
 * purge des fichiers), sinon désactivation (historique de commande
 * préservé) — voir lib/productDeletion.ts. Avant ce fix, DELETE tentait
 * toujours une suppression définitive : un produit déjà vendu faisait
 * échouer la requête avec une violation de clé étrangère (OrderItem n'a
 * pas de cascade), renvoyée en 500 générique sans explication au marchand.
 */
router.delete('/products/:id', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const id = Number(req.params.id)
    const existing = await prisma.product.findFirst({ where: { id, storeId: store.id } })
    if (!existing) { res.status(404).json({ success: false, message: 'Produit introuvable.' }); return }

    const result = await deleteProductAtomic(id)
    res.json({
      success: true,
      message: result === 'hard' ? 'Produit supprimé définitivement' : 'Produit désactivé (déjà commandé — historique conservé)',
    })
  } catch (err) {
    logger.error('[seller/products delete]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

router.post('/products/:id/duplicate', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }
    if (!store.isApproved) { res.status(403).json({ success: false, message: 'Boutique en attente de validation.' }); return }

    const id = Number(req.params.id)
    const source = await prisma.product.findFirst({ where: { id, storeId: store.id }, include: { images: true } })
    if (!source) { res.status(404).json({ success: false, message: 'Produit introuvable.' }); return }

    const copy = await prisma.product.create({
      data: {
        name: `${source.name} (copie)`, category: source.category, brand: source.brand,
        price: source.price, oldPrice: source.oldPrice, stock: source.stock,
        isActive: false, description: source.description, storeId: store.id,
        images: { create: source.images.map(i => ({ url: i.url, thumbnailUrl: i.thumbnailUrl, position: i.position })) },
      },
      include: { images: true },
    })
    res.status(201).json({ success: true, data: shapeProduct(copy) })
  } catch (err) {
    logger.error('[seller/products duplicate]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Commandes ────────────────────────────────────────────────────── */
router.get('/orders', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const status   = String(req.query.status ?? 'all')
    const search   = req.query.search ? String(req.query.search).toLowerCase() : undefined
    const page     = Math.max(1, Number(req.query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)))

    const allItems = await storeOrderItems(store.id)
    const byOrder = new Map<string, typeof allItems>()
    for (const it of allItems) {
      if (!byOrder.has(it.orderId)) byOrder.set(it.orderId, [])
      byOrder.get(it.orderId)!.push(it)
    }

    let orderIds = [...byOrder.keys()]
    if (status !== 'all') orderIds = orderIds.filter(id => byOrder.get(id)![0].order.status === status)
    if (search) {
      orderIds = orderIds.filter(id => {
        const o = byOrder.get(id)![0].order
        return o.orderNumber.toLowerCase().includes(search) ||
          `${o.clientPrenom} ${o.clientNom}`.toLowerCase().includes(search)
      })
    }
    orderIds.sort((a, b) => byOrder.get(b)![0].order.createdAt.getTime() - byOrder.get(a)![0].order.createdAt.getTime())

    const total = orderIds.length
    const paged = orderIds.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    const shaped = paged.map(id => {
      const items = byOrder.get(id)!
      return shapeOrder(items[0].order, items)
    })

    res.json({ success: true, data: { items: shaped, total, page, pageSize } })
  } catch (err) {
    logger.error('[seller/orders list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

router.get('/orders/:id', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const items = await prisma.orderItem.findMany({
      where: { orderId: req.params.id, product: { storeId: store.id } },
      include: { order: true },
    })
    if (items.length === 0) { res.status(404).json({ success: false, message: 'Commande introuvable.' }); return }

    res.json({ success: true, data: shapeOrder(items[0].order, items) })
  } catch (err) {
    logger.error('[seller/orders detail]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

router.patch('/orders/:id/status', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const { status } = z.object({ status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']) }).parse(req.body)

    const items = await prisma.orderItem.findMany({
      where: { orderId: req.params.id, product: { storeId: store.id } },
      include: { order: true },
    })
    if (items.length === 0) { res.status(404).json({ success: false, message: 'Commande introuvable.' }); return }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        deliveredAt: status === 'delivered' && items[0].order.status !== 'delivered' ? new Date() : undefined,
      },
    })
    res.json({ success: true, data: shapeOrder(updated, items) })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: 'Statut invalide' }); return }
    logger.error('[seller/orders status]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Clients ──────────────────────────────────────────────────────── */
router.get('/customers', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const search   = req.query.search ? String(req.query.search).toLowerCase() : undefined
    const segment  = String(req.query.segment ?? 'all')
    const page     = Math.max(1, Number(req.query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)))

    const items = await storeOrderItems(store.id, { statuses: COUNTED_STATUSES })
    const byCustomer = new Map<string, { name: string; email: string; phone: string; orders: Set<string>; total: number; lastOrderAt: string }>()
    for (const it of items) {
      const key = it.order.userId ?? it.order.clientEmail
      const curr = byCustomer.get(key) ?? {
        name: `${it.order.clientPrenom} ${it.order.clientNom}`.trim(),
        email: it.order.clientEmail, phone: it.order.clientTelephone,
        orders: new Set<string>(), total: 0, lastOrderAt: it.order.createdAt.toISOString(),
      }
      curr.orders.add(it.orderId)
      curr.total += it.price * it.qty
      if (it.order.createdAt.toISOString() > curr.lastOrderAt) curr.lastOrderAt = it.order.createdAt.toISOString()
      byCustomer.set(key, curr)
    }

    let customers = [...byCustomer.entries()].map(([id, c]) => ({
      id, name: c.name, email: c.email, phone: c.phone, city: '', country: '',
      segment: (c.orders.size >= 5 ? 'vip' : c.orders.size >= 2 ? 'regular' : 'new') as 'vip' | 'regular' | 'new',
      ordersCount: c.orders.size, totalSpent: c.total, lastOrderAt: c.lastOrderAt, createdAt: c.lastOrderAt,
    }))

    if (segment !== 'all') customers = customers.filter(c => c.segment === segment)
    if (search) customers = customers.filter(c => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search))
    customers.sort((a, b) => b.totalSpent - a.totalSpent)

    const total = customers.length
    const paged = customers.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    res.json({ success: true, data: { items: paged, total, page, pageSize } })
  } catch (err) {
    logger.error('[seller/customers list]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

router.get('/customers/:id', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const items = await storeOrderItems(store.id, { statuses: COUNTED_STATUSES })
    const mine = items.filter(it => (it.order.userId ?? it.order.clientEmail) === req.params.id)
    if (mine.length === 0) { res.status(404).json({ success: false, message: 'Client introuvable.' }); return }

    const byOrder = new Map<string, typeof mine>()
    for (const it of mine) {
      if (!byOrder.has(it.orderId)) byOrder.set(it.orderId, [])
      byOrder.get(it.orderId)!.push(it)
    }
    const orders = [...byOrder.values()]
      .map(its => shapeOrder(its[0].order, its))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const total = mine.reduce((s, i) => s + i.price * i.qty, 0)
    const first = mine[0].order
    const customer = {
      id: req.params.id, name: `${first.clientPrenom} ${first.clientNom}`.trim(),
      email: first.clientEmail, phone: first.clientTelephone, city: '', country: '',
      segment: (byOrder.size >= 5 ? 'vip' : byOrder.size >= 2 ? 'regular' : 'new') as 'vip' | 'regular' | 'new',
      ordersCount: byOrder.size, totalSpent: total,
      lastOrderAt: orders[0]?.createdAt ?? null, createdAt: orders[orders.length - 1]?.createdAt ?? first.createdAt.toISOString(),
    }

    res.json({ success: true, data: { customer, orders } })
  } catch (err) {
    logger.error('[seller/customers detail]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/*
 * GET /api/seller/search?q= — recherche globale (barre du Topbar) : produits
 * (nom, SKU), commandes (numéro, client), clients (nom, email) — toujours
 * scopée à la boutique du marchand authentifié. Plafonnée à 5 résultats par
 * catégorie : c'est une aide à la navigation rapide, pas une page de
 * résultats — la recherche complète reste sur chaque page dédiée
 * (Produits/Commandes/Clients) qui a déjà son propre filtre.
 */
router.get('/search', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) { res.json({ success: true, data: { products: [], orders: [], customers: [] } }); return }
    const needle = q.toLowerCase()

    // "SKG-00042" ou "42" → id produit direct, en plus de la recherche par nom.
    const skuMatch = needle.match(/^(?:skg-)?0*(\d+)$/)
    const skuId = skuMatch ? Number(skuMatch[1]) : null

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...(skuId !== null ? [{ id: skuId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, price: true, images: { take: 1, orderBy: { position: 'asc' }, select: { url: true, thumbnailUrl: true } } },
    })

    const allItems = await storeOrderItems(store.id)
    const byOrder = new Map<string, typeof allItems>()
    for (const it of allItems) {
      if (!byOrder.has(it.orderId)) byOrder.set(it.orderId, [])
      byOrder.get(it.orderId)!.push(it)
    }
    const matchingOrders = [...byOrder.values()]
      .filter(its => {
        const o = its[0].order
        return o.orderNumber.toLowerCase().includes(needle) || `${o.clientPrenom} ${o.clientNom}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => b[0].order.createdAt.getTime() - a[0].order.createdAt.getTime())
      .slice(0, 5)
      .map(its => ({
        id: its[0].order.id, orderNumber: its[0].order.orderNumber, status: its[0].order.status,
        client: `${its[0].order.clientPrenom} ${its[0].order.clientNom}`.trim(),
        total: its.reduce((s, i) => s + i.price * i.qty, 0),
      }))

    const byCustomer = new Map<string, { name: string; email: string; lastOrderAt: string }>()
    for (const it of allItems) {
      const key = it.order.userId ?? it.order.clientEmail
      const curr = byCustomer.get(key) ?? {
        name: `${it.order.clientPrenom} ${it.order.clientNom}`.trim(),
        email: it.order.clientEmail, lastOrderAt: it.order.createdAt.toISOString(),
      }
      if (it.order.createdAt.toISOString() > curr.lastOrderAt) curr.lastOrderAt = it.order.createdAt.toISOString()
      byCustomer.set(key, curr)
    }
    const matchingCustomers = [...byCustomer.entries()]
      .filter(([, c]) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))
      .sort((a, b) => b[1].lastOrderAt.localeCompare(a[1].lastOrderAt))
      .slice(0, 5)
      .map(([id, c]) => ({ id, name: c.name, email: c.email }))

    res.json({
      success: true,
      data: {
        products: products.map(p => ({ id: p.id, name: p.name, price: p.price, image: p.images[0]?.thumbnailUrl || p.images[0]?.url || null })),
        orders: matchingOrders,
        customers: matchingCustomers,
      },
    })
  } catch (err) {
    logger.error('[seller/search]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* ── Statistiques ─────────────────────────────────────────────────── */
router.get('/analytics', requireSeller, async (req, res) => {
  try {
    const store = await requireMyStore(req.user!.userId)
    if (!store) { res.status(404).json({ success: false, message: 'Boutique introuvable.' }); return }

    const items = await storeOrderItems(store.id, { statuses: COUNTED_STATUSES })

    const byCategory = new Map<string, { revenue: number; unitsSold: number }>()
    const productCategory = new Map<number, string>()
    const products = await prisma.product.findMany({ where: { storeId: store.id }, select: { id: true, category: true } })
    for (const p of products) productCategory.set(p.id, p.category)
    for (const it of items) {
      const category = productCategory.get(it.productId) ?? 'Autre'
      const curr = byCategory.get(category) ?? { revenue: 0, unitsSold: 0 }
      curr.revenue += it.price * it.qty
      curr.unitsSold += it.qty
      byCategory.set(category, curr)
    }
    const categorySales = [...byCategory.entries()].map(([category, v]) => ({ category, ...v }))

    const now = new Date()
    const periodSales: { label: string; revenue: number; orders: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthItems = items.filter(it => it.order.createdAt >= monthDate && it.order.createdAt < nextMonth)
      periodSales.push({
        label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: monthItems.reduce((s, it) => s + it.price * it.qty, 0),
        orders: new Set(monthItems.map(it => it.orderId)).size,
      })
    }

    res.json({ success: true, data: { categorySales, periodSales } })
  } catch (err) {
    logger.error('[seller/analytics]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
