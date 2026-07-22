/* ─────────────────────────────────────────────────────────────
   Module de synchronisation catalogue → Google Merchant Center :
   préflight (validation sans appel réseau), lancement async,
   historique, relance des échecs, export CSV. Monté sur
   /api/products/sync-merchant dans app.ts.

   Toutes les routes sont admin — pas de garde par route, un seul
   router.use(requireAdmin) en tête suffit.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, validateQuery, zCuidIdParam, zPaginationQuery } from '../middleware/validate'
import { logger } from '../lib/logger'
import { logAdminAction } from '../lib/auditLog'
import { isMerchantConfigured, preflightProduct, PRODUCT_SELECT_FOR_MERCHANT } from '../lib/merchantFeed'
import { startSyncRun, isSyncRunning } from '../lib/merchantSyncRunner'

const router = Router()
router.use(requireAdmin)

/* ─────────────────────────────────────────────────────────────
   POST /preview — valide localement (aucun appel Google) l'ensemble
   ou une sélection de produits, pour l'écran de confirmation.
───────────────────────────────────────────────────────────── */
const previewSchema = z.object({
  productIds: z.array(z.number().int().positive()).optional(),
})

router.post('/preview', validate(previewSchema), async (req, res) => {
  try {
    if (!isMerchantConfigured()) {
      res.status(400).json({ success: false, message: 'Google Merchant Center non configuré côté serveur (variables GOOGLE_MERCHANT_* manquantes)' })
      return
    }
    const { productIds } = req.body as { productIds?: number[] }
    const products = await prisma.product.findMany({
      where: productIds && productIds.length > 0 ? { id: { in: productIds } } : { isActive: true },
      select: PRODUCT_SELECT_FOR_MERCHANT,
    })

    const items = products.map(p => {
      const { errors, warnings } = preflightProduct(p)
      return { productId: p.id, name: p.name, valid: errors.length === 0, errors, warnings }
    })

    res.json({
      success: true,
      data: {
        total: items.length,
        validCount: items.filter(i => i.valid).length,
        items,
      },
    })
  } catch (err) {
    logger.error('[merchant-sync] échec preview', err)
    res.status(500).json({ success: false, message: 'Erreur lors de la validation des produits' })
  }
})

/* ─────────────────────────────────────────────────────────────
   POST /start — lance une synchronisation (fire-and-forget côté
   serveur, le client sonde /runs/:id pour la progression).
───────────────────────────────────────────────────────────── */
const startSchema = z.object({
  mode: z.enum(['full', 'selected']),
  productIds: z.array(z.number().int().positive()).optional(),
}).refine(d => d.mode === 'full' || (d.productIds && d.productIds.length > 0), {
  message: 'productIds requis pour une synchronisation "selected"',
  path: ['productIds'],
})

router.post('/start', validate(startSchema), async (req, res) => {
  try {
    const { mode, productIds } = req.body as { mode: 'full' | 'selected'; productIds?: number[] }
    const { runId } = await startSyncRun({
      mode,
      productIds,
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
    })
    logAdminAction(req, { action: 'merchant-sync.start', targetType: 'MerchantSyncRun', targetId: runId, metadata: { mode, count: productIds?.length } })
    res.json({ success: true, data: { runId } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors du lancement de la synchronisation'
    // Messages levés volontairement par startSyncRun (config manquante / verrou) —
    // sûrs à renvoyer tels quels, pas une fuite d'erreur interne.
    res.status(400).json({ success: false, message })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /lock — permet au front de savoir, dès l'ouverture de la page,
   si une synchro est déjà en cours (bouton désactivé plutôt qu'un
   409 après coup).
───────────────────────────────────────────────────────────── */
router.get('/lock', async (_req, res) => {
  const running = await isSyncRunning('google')
  res.json({ success: true, data: { running } })
})

/* ─────────────────────────────────────────────────────────────
   GET /runs — historique paginé.
───────────────────────────────────────────────────────────── */
router.get('/runs', validateQuery(zPaginationQuery), async (req, res) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number }
  const [runs, total] = await Promise.all([
    prisma.merchantSyncRun.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.merchantSyncRun.count(),
  ])
  res.json({ success: true, data: runs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

/* ─────────────────────────────────────────────────────────────
   GET /runs/:id — détail + items (polling de progression).
───────────────────────────────────────────────────────────── */
router.get('/runs/:id', validateParams(zCuidIdParam), async (req, res) => {
  const { id } = req.params
  const run = await prisma.merchantSyncRun.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  if (!run) {
    res.status(404).json({ success: false, message: 'Synchronisation introuvable' })
    return
  }
  res.json({ success: true, data: run })
})

/* ─────────────────────────────────────────────────────────────
   POST /runs/:id/retry — relance uniquement les produits en échec
   de cette run (pas les "skipped" — ceux-là ont des erreurs de
   validation qui n'ont pas changé, les relancer serait inutile).
───────────────────────────────────────────────────────────── */
router.post('/runs/:id/retry', validateParams(zCuidIdParam), async (req, res) => {
  try {
    const { id } = req.params
    const failedItems = await prisma.merchantSyncItem.findMany({
      where: { runId: id, status: 'failed' },
      select: { productId: true },
    })
    if (failedItems.length === 0) {
      res.status(400).json({ success: false, message: 'Aucun produit en échec à relancer sur cette synchronisation' })
      return
    }
    const { runId } = await startSyncRun({
      mode: 'selected',
      productIds: failedItems.map(i => i.productId),
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
    })
    logAdminAction(req, { action: 'merchant-sync.retry', targetType: 'MerchantSyncRun', targetId: runId, metadata: { retryOf: id, count: failedItems.length } })
    res.json({ success: true, data: { runId } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la relance'
    res.status(400).json({ success: false, message })
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /runs/:id/export.csv — rapport détaillé téléchargeable.
───────────────────────────────────────────────────────────── */
router.get('/runs/:id/export.csv', validateParams(zCuidIdParam), async (req, res) => {
  const { id } = req.params
  const run = await prisma.merchantSyncRun.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  if (!run) {
    res.status(404).json({ success: false, message: 'Synchronisation introuvable' })
    return
  }

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = ['Produit ID', 'Nom', 'Statut', 'Erreur', 'Avertissements'].map(escape).join(',')
  const rows = run.items.map(i => [
    String(i.productId),
    i.productName,
    i.status,
    i.error ?? '',
    i.warnings ? (JSON.parse(i.warnings) as string[]).join(' | ') : '',
  ].map(escape).join(','))

  const csv = [header, ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="sync-merchant-${run.id}.csv"`)
  res.send('﻿' + csv) // BOM — Excel ouvre correctement les accents en UTF-8
})

export default router
