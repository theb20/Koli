/* ─────────────────────────────────────────────────────────────
   Exécution des synchronisations Merchant en tâche de fond.

   Pas de file de jobs (Redis/BullMQ) dans ce projet — un seul processus
   Node suffit à ce volume : on lance le travail en "fire and forget"
   juste après avoir créé la ligne MerchantSyncRun, et le front sonde
   GET /runs/:id pour la progression. Le verrou anti-double-sync
   s'appuie simplement sur "existe-t-il déjà une run en status=running
   pour ce provider" — suffisant pour un seul process.
───────────────────────────────────────────────────────────── */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  isMerchantConfigured, getMerchantClient, preflightProduct,
  syncProductToMerchant, PRODUCT_SELECT_FOR_MERCHANT,
} from './merchantFeed'

export type SyncMode = 'full' | 'selected' | 'retry'

export async function isSyncRunning(provider = 'google'): Promise<boolean> {
  const running = await prisma.merchantSyncRun.findFirst({
    where: { provider, status: 'running' },
    select: { id: true },
  })
  return running !== null
}

type StartParams = {
  mode: SyncMode
  productIds?: number[] // requis pour "selected"/"retry", ignoré pour "full"
  actorId: string
  actorEmail: string
}

/**
 * Crée la run et lance immédiatement le travail en arrière-plan (non
 * attendu). Lève si une run est déjà en cours (verrou) ou si Merchant
 * n'est pas configuré.
 */
export async function startSyncRun({ mode, productIds, actorId, actorEmail }: StartParams): Promise<{ runId: string }> {
  if (!isMerchantConfigured()) {
    throw new Error('Google Merchant Center non configuré côté serveur (variables GOOGLE_MERCHANT_* manquantes)')
  }
  if (await isSyncRunning('google')) {
    throw new Error('Une synchronisation est déjà en cours — attendez qu\'elle se termine avant d\'en lancer une nouvelle.')
  }

  const run = await prisma.merchantSyncRun.create({
    data: { provider: 'google', mode, status: 'running', actorId, actorEmail },
  })

  void executeRun(run.id, mode, productIds).catch(err => {
    logger.error('[merchant-sync] échec inattendu de la run', run.id, err)
  })

  return { runId: run.id }
}

async function executeRun(runId: string, mode: SyncMode, productIds?: number[]): Promise<void> {
  const accountId    = process.env.GOOGLE_MERCHANT_ACCOUNT_ID!
  const dataSourceId = process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID!
  const client = getMerchantClient()

  const products = await prisma.product.findMany({
    where: mode === 'full' ? { isActive: true } : { id: { in: productIds ?? [] } },
    select: PRODUCT_SELECT_FOR_MERCHANT,
  })

  await prisma.merchantSyncRun.update({ where: { id: runId }, data: { total: products.length } })

  let succeeded = 0, failedCount = 0, skippedCount = 0

  for (const p of products) {
    const outcome = await syncProductToMerchant(client, p, accountId, dataSourceId)
    const warnings = preflightProduct(p).warnings

    if (outcome.status === 'success') succeeded++
    else if (outcome.status === 'failed') failedCount++
    else skippedCount++

    await prisma.$transaction([
      prisma.merchantSyncItem.create({
        data: {
          runId, productId: p.id, productName: p.name, status: outcome.status,
          error: outcome.error ?? null,
          warnings: warnings.length ? JSON.stringify(warnings) : null,
        },
      }),
      prisma.product.update({
        where: { id: p.id },
        data: { merchantSyncStatus: outcome.status, merchantSyncedAt: new Date() },
      }),
      prisma.merchantSyncRun.update({
        where: { id: runId },
        data: { succeeded, failedCount, skippedCount },
      }),
    ])
  }

  await prisma.merchantSyncRun.update({
    where: { id: runId },
    data: { status: 'completed', finishedAt: new Date() },
  })

  await notifyAdmins(runId, { total: products.length, succeeded, failedCount, skippedCount })
}

async function notifyAdmins(runId: string, r: { total: number; succeeded: number; failedCount: number; skippedCount: number }): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    if (admins.length === 0) return
    const ok = r.failedCount === 0
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        type:   'merchant-sync',
        title:  ok ? 'Synchronisation Google Merchant terminée' : 'Synchronisation Google Merchant terminée avec des erreurs',
        body:   `${r.succeeded}/${r.total} produits synchronisés${r.failedCount ? ` · ${r.failedCount} échec(s)` : ''}${r.skippedCount ? ` · ${r.skippedCount} ignoré(s)` : ''}`,
        link:   `/products?syncRun=${runId}`,
      })),
    })
  } catch (err) {
    logger.error('[merchant-sync] échec notification admins', err) // non bloquant
  }
}
