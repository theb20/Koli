import 'dotenv/config'
import { app } from './app.js'
import { closeBrowser } from './pdf/generatePdf.js'
import { startScheduler } from './lib/scheduler.js'

const port = Number(process.env.PORT) || 4100

const server = app.listen(port, () => {
  console.log(`Proforma API en écoute sur http://localhost:${port}`)
  startScheduler()
})

async function shutdown() {
  server.close()
  await closeBrowser()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
