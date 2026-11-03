import 'dotenv/config'
import './appsignal'
import './instrument'
import app from './app'
import { prisma } from './lib/prisma'
import { processDueDealAnnouncements } from './lib/dealAnnouncements'
import { processDueMonthlySettlements } from './lib/settlements'
import { logger } from './lib/logger'
const PORT = parseInt(process.env.PORT ?? '4000')

async function main() {
  // Test connexion DB
  await prisma.$connect()
  logger.info('✅ Base de données connectée')

  const HOST = process.env.HOST ?? '0.0.0.0'

  app.listen(PORT, HOST, () => {
    logger.info(`
╔══════════════════════════════════════╗
║      🛍  SKIGNAS API — v1.0.0        ║
╠══════════════════════════════════════╣
║  Serveur  : http://localhost:${PORT}    ║
║  Local    : http://${HOST}:${PORT}        ║
║  Env      : ${(process.env.NODE_ENV ?? 'development').padEnd(22)}  ║
║  DB       : ${(process.env.DATABASE_URL ?? '').slice(0, 22).padEnd(22)}  ║
╚══════════════════════════════════════╝
    `)
  })

  // Envoie les annonces de vente flash programmées dont l'heure est arrivée
  setInterval(() => { processDueDealAnnouncements().catch(err => logger.error('[deal-announcements poller]', err)) }, 60_000)

  // Génère et envoie le relevé mensuel du mois précédent dès qu'il est
  // disponible — idempotent (voir settlements.ts), vérifié toutes les 6h
  // plutôt qu'un vrai cron pour rester cohérent avec le poller ci-dessus.
  setInterval(() => { processDueMonthlySettlements().catch(err => logger.error('[settlements poller]', err)) }, 6 * 60 * 60_000)
  processDueMonthlySettlements().catch(err => logger.error('[settlements poller]', err))
}

main().catch(err => {
  logger.error('❌ Erreur démarrage:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu — arrêt gracieux...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
