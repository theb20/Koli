import 'dotenv/config'
import app from './app'
import { prisma } from './lib/prisma'
import { processDueDealAnnouncements } from './lib/dealAnnouncements'
const PORT = parseInt(process.env.PORT ?? '4000')

async function main() {
  // Test connexion DB
  await prisma.$connect()
  console.log('✅ Base de données connectée')

  const HOST = process.env.HOST ?? '0.0.0.0'

  app.listen(PORT, HOST, () => {
    console.log(`
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
  setInterval(() => { processDueDealAnnouncements().catch(err => console.error('[deal-announcements poller]', err)) }, 60_000)
}

main().catch(err => {
  console.error('❌ Erreur démarrage:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu — arrêt gracieux...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
