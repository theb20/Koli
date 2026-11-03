/* ─────────────────────────────────────────────────────────────
   Relevés mensuels marchand — Skignas calcule (merchantgo) et ENVOIE
   (ici) à chaque marchand le résumé de son mois (ventes, commission, net),
   jamais l'inverse. Suit le même pattern de "poller périodique idempotent"
   que dealAnnouncements.ts plutôt qu'un vrai cron : pas de nouvelle
   dépendance, et la génération côté merchantgo est déjà idempotente par
   (marchand, mois) — un appel répété ne recrée jamais un relevé existant,
   l'email n'est envoyé qu'aux relevés encore au statut "finalized" (pas
   "sent"), donc rejouer ce poller plusieurs fois par jour est sans risque.
───────────────────────────────────────────────────────────── */
import { prisma } from './prisma'
import { logger } from './logger'
import { isMerchantgoConfigured, generateSettlements, markSettlementSent, type MerchantSettlement } from './merchantgo'
import { sendMonthlySettlementEmail } from './mailer'

/** 1er jour du mois précédent, à minuit UTC — le seul mois jamais "dû" (le mois en cours n'est jamais clos). */
function previousMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
}

export async function processDueMonthlySettlements(): Promise<void> {
  if (!isMerchantgoConfigured()) return

  try {
    const periodStart = previousMonthStart()
    const periodStartStr = periodStart.toISOString().slice(0, 10) // "AAAA-MM-01"

    const res = await generateSettlements(periodStartStr)
    const settlements: MerchantSettlement[] = res.data ?? []
    const pending = settlements.filter(s => s.status === 'finalized')
    if (pending.length === 0) return

    const userIds = pending.map(s => s.user_id)
    const stores = await prisma.sellerStore.findMany({
      where:  { userId: { in: userIds } },
      select: { userId: true, name: true, user: { select: { email: true } } },
    })
    const storeByUserId = new Map(stores.map(s => [s.userId, s]))

    for (const s of pending) {
      const store = storeByUserId.get(s.user_id)
      if (!store) {
        logger.error('[settlements] boutique introuvable pour relevé', s.id, s.user_id)
        continue
      }
      try {
        await sendMonthlySettlementEmail(store.user.email, {
          storeName:        store.name,
          periodStart:      new Date(s.period_start),
          grossAmount:      s.gross_amount,
          commissionAmount: s.commission_amount,
          netAmount:        s.net_amount,
          transactionCount: s.transaction_count,
        })
        await markSettlementSent(s.id)
        await prisma.notification.create({
          data: {
            userId: s.user_id,
            type:   'order',
            title:  'Relevé mensuel disponible',
            body:   `${s.net_amount.toLocaleString('fr-FR')} FCFA net — voir le détail dans Relevés.`,
            link:   '/releves',
          },
        })
      } catch (err) {
        // Un échec (email, DB...) sur UN marchand ne doit jamais bloquer les
        // autres — le relevé reste "finalized" (pas "sent"), donc retenté
        // automatiquement au prochain passage du poller.
        logger.error('[settlements] échec envoi relevé', s.id, s.user_id, err)
      }
    }
  } catch (err) {
    logger.error('[settlements] échec processDueMonthlySettlements', err)
  }
}
